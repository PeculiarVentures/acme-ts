import {
  cryptoProvider, JsonWebSignature, JwsProtected, Response as AcmeResponse,
  Content, ContentType, AcmeError, ErrorType, HttpStatusCode, Headers,
} from "@peculiar/acme-core";
import { Error } from "@peculiar/acme-protocol";

export interface ClientOptions {
  crypto?: Crypto;
  fetch?: typeof fetch;
  debug?: boolean;
  defaultHash?: string;
}

export type AcmeMethod = "GET" | "HEAD" | "POST" | "POST-as-GET";


export interface GetParams<T> {
  method: "GET" | "HEAD";
  convert: (res: AcmeResponse) => T;
}
export interface PostParams<T> {
  method: "POST" | "POST-as-GET";
  body?: object;
  kid: CryptoKey | string;
  nonce: string;
  key: CryptoKey;
  hash?: AlgorithmIdentifier;
  convert: (res: AcmeResponse) => T;
}

export type RequestParams<T> = GetParams<T> | PostParams<T>;

export interface ApiResponse<T> {
  status: HttpStatusCode;
  headers: Headers;
  content: T;
}

export class BaseClient {

  public static createResponse<T>(resp: AcmeResponse, content: T): ApiResponse<T> {
    return {
      status: resp.status,
      headers: resp.headers,
      content: content,
    };
  }

  public options: ClientOptions;

  public constructor(options: ClientOptions = {}) {
    this.options = {
      crypto: cryptoProvider.get(),
      debug: options.debug,
      defaultHash: "SHA-256",
      fetch: typeof fetch !== "undefined" ? fetch : undefined,
      ...options
    };
  }

  protected async fetch<T = Content>(url: string, params: RequestParams<T>) {
    if (!this.options.fetch) {
      throw new Error("Cannot get 'fetch' option");
    }

    //Log request
    if (this.options.debug) {
      console.log(`REQUEST ${params.method} ${url}`);
      console.log((params as PostParams<T>).body)
    }

    const fetch = this.options.fetch;
    let response: Response | undefined;
    if (params.method === "GET" || params.method === "HEAD") {
      // GET
      response = await fetch(url, { method: params.method });
    } else {
      // POST
      const crypto = this.getCrypto();
      const postParams = params as PostParams<T>;
      const request: RequestInit = {
        method: "POST",
      };
      // Fill header
      const header: JwsProtected = {
        url,
        nonce: postParams.nonce,
      };
      if (typeof postParams.kid === "string") {
        header.kid = postParams.kid;
      } else {
        header.jwk = await this.getCrypto().subtle.exportKey("jwk", postParams.kid);
      }
      // Create JWS
      const jws = new JsonWebSignature({
        protected: header,
        payload: !postParams.method || postParams.method === "POST-as-GET"
          ? ""
          : postParams.body,
      });
      await jws.sign({ hash: postParams.hash || this.options.defaultHash, ...postParams.key.algorithm }, postParams.key, crypto);
      request.body = jws.toString();
      request.headers = {
        "Content-Type": ContentType.joseJson,
      };

      response = await fetch(url, request);

      //Log response
      if (this.options.debug) {
        console.log("RESPONSE", response);
      }

    }

    // Convert to ACME response
    const acmeResp = new AcmeResponse();
    acmeResp.status = response.status;
    response.headers.forEach((v, k) => acmeResp.headers.set(k, v));
    const buf = await response.arrayBuffer();
    acmeResp.content = new Content(buf, acmeResp.headers.contentType?.mediaType || ContentType.json);

    // If Error response, throw AcmeError
    if (acmeResp.content && (acmeResp.status < 200 || acmeResp.status > 299)) {
      if (acmeResp.headers.contentType?.mediaType === ContentType.problemJson) {
        const json = acmeResp.content.toJSON() as Error;
        throw new AcmeError(json.type, json.detail, acmeResp.status);
      } else {
        throw new AcmeError(ErrorType.serverInternal, "Wrong Content-Type of ACME response. Must be application/problem+json. See inner exception for more details.", acmeResp.status, new globalThis.Error(acmeResp.content.toString()));
      }
    }

    return BaseClient.createResponse(acmeResp, params.convert(acmeResp));
  }

  protected getCrypto() {
    if (!this.options.crypto) {
      throw new Error("Cannot get 'crypto' option");
    }
    return this.options.crypto;
  }
}