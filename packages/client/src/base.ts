import * as core from "@peculiar/acme-core";
import { JsonWebSignature, JwsProtectedSetter, JsonWebKey, } from "@peculiar/jose";
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
  convert: (res: core.Response) => T;
}
export interface PostParams<T> {
  method: "POST" | "POST-as-GET";
  body?: any;
  kid: CryptoKey | string;
  nonce: string;
  key: CryptoKey;
  hash?: AlgorithmIdentifier;
  convert: (res: core.Response) => T;
}

export type RequestParams<T> = GetParams<T> | PostParams<T>;

export interface ApiResponse<T> {
  status: core.HttpStatusCode;
  headers: core.Headers;
  content: T;
}

export class BaseClient {

  public static createResponse<T>(resp: core.Response, content: T): ApiResponse<T> {
    return {
      status: resp.status,
      headers: resp.headers,
      content: content,
    };
  }

  public options: ClientOptions;

  public constructor(options: ClientOptions = {}) {
    this.options = {
      crypto: options.crypto || core.cryptoProvider.get(),
      debug: options.debug,
      defaultHash: "SHA-256",
      fetch: typeof fetch !== "undefined" ? fetch : undefined,
      ...options
    };
  }

  protected async fetch<T = core.Content>(url: string, params: RequestParams<T>) {
    if (!this.options.fetch) {
      throw new Error("Cannot get 'fetch' option");
    }

    //Log request
    if (this.options.debug) {
      console.log(`REQUEST ${params.method} ${url}`);
      if ("body" in params) {
        console.log("REQUEST BODY", params.body);
      }
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
      const header: JwsProtectedSetter = {
        url,
        nonce: postParams.nonce,
      };
      if (typeof postParams.kid === "string") {
        header.kid = postParams.kid;
      } else {
        const jwk = await this.getCrypto().subtle.exportKey("jwk", postParams.kid);
        header.jwk = new JsonWebKey(crypto, jwk);
      }
      // Create JWS
      const jws = new JsonWebSignature({
        protected: header,
        payload: !postParams.method || postParams.method === "POST-as-GET"
          ? ""
          : postParams.body,
      }, this.getCrypto());
      await jws.sign({ hash: postParams.hash || this.options.defaultHash, ...postParams.key.algorithm }, postParams.key, crypto);
      request.body = jws.toString();
      request.headers = {
        "Content-Type": core.ContentType.joseJson,
      };

      response = await fetch(url, request);
    }

    // Convert to ACME response
    const acmeResp = new core.Response();
    acmeResp.status = response.status;
    response.headers.forEach((v, k) => acmeResp.headers.set(k, v));
    const buf = await response.arrayBuffer();
    acmeResp.content = new core.Content(buf, acmeResp.headers.contentType?.mediaType || core.ContentType.json);

    // If Error response, throw AcmeError
    if (this.options.debug) {
      console.log(`RESPONSE ${params.method} ${url}`);
    }
    if (acmeResp.content && (acmeResp.status < 200 || acmeResp.status > 299)) {
      if (acmeResp.headers.contentType?.mediaType === core.ContentType.problemJson) {
        const json = acmeResp.content.toJSON() as Error;
        if (this.options.debug) {
          console.log("RESPONSE", json);
        }
        throw new core.AcmeError(json.type, json.detail, acmeResp.status);
      } else {
        const text = acmeResp.content.toString();
        if (this.options.debug) {
          console.log("RESPONSE", text);
        }
        throw new core.AcmeError(core.ErrorType.serverInternal, "Wrong Content-Type of ACME response. Must be application/problem+json. See inner exception for more details.", acmeResp.status, new globalThis.Error(text));
      }
    }

    const res = BaseClient.createResponse(acmeResp, params.convert(acmeResp));

    if (this.options.debug) {
      console.log("RESPONSE", res);
    }

    return res;
  }

  protected getCrypto() {
    if (!this.options.crypto) {
      throw new Error("Cannot get 'crypto' option");
    }
    return this.options.crypto;
  }
}