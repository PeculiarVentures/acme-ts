import { Convert } from "pvtsutils";
import { PemConverter, AcmeError, JsonWebSignature, JsonWebSignatureParams } from "@peculiar/acme-core";
import { Directory, Authorization, Account, Order, AccountCreateParams, AccountUpdateParams, OrderCreateParams, Challenge, Finalize, Token, Base64UrlString, CreateAccountProtocol } from "@peculiar/acme-protocol";

export enum RevocationReason {
  Unspecified = 0,
  KeyCompromise = 1,
  CACompromise = 2,
  AffiliationChanged = 3,
  Superseded = 4,
  CessationOfOperation = 5,
  CertificateHold = 6,
  RemoveFromCRL = 8,
  PrivilegeWithdrawn = 9,
  AACompromise = 10,
}

export interface AcmeClientOptions {
  /**
   * Private key for authentication
   */
  authKey: AuthKey;
  crypto: Crypto;
  debug?: boolean;
  hash?: string;
}

export interface CreateJwsOptions {
  url?: string;
  kid?: string;
  omitNonce?: boolean;
  key?: CryptoKey | CryptoKeyPair;
}

export interface GetOptions {
  hostname?: string;
}

export interface PostResult<T = any> extends Headers {
  status: number;
  result: T;
}

export interface Headers {
  link?: string | string[];
  location?: string;
}

export interface AuthKey {
  key: CryptoKeyPair;
  id?: Base64UrlString;
}

type Method = "POST" | "GET";

/**
 * Class of work with ACME servers
 */
export class Client {

  public lastNonce = "";
  public directory?: Directory;
  public authKey: AuthKey;
  private debug: boolean;
  private crypto: Crypto;
  private hash: string;

  public constructor(options: AcmeClientOptions) {
    this.authKey = {
      key: options.authKey.key,
    };
    this.debug = !!options.debug;
    this.crypto = options.crypto;
    this.hash = options.hash || "SHA-256";
  }

  /**
   * Retrieving a list of controllers from an ACME server
   * @param url ACME Server Controller List Issue URL
   */
  public async initialize(url: string) {
    const response = await fetch(url, { method: "GET" });
    this.directory = await response.json();
    return this.directory;
  }

  /**
   * Confirmation Code Request
   */
  public async nonce() {
    const response = await fetch(this.getDirectory().newNonce, { method: "GET" });
    return this.getNonce(response);
  }

  /**
   * Create account.
   * To create a new account, you must specify the termsOfServiceAgreed: true parameter.
   * To search for an account, you must specify the parameter onlyReturnExisting: true.
   * @param params Request parameters
   */
  public async createAccount(params: AccountCreateParams) {
    const newParam: CreateAccountProtocol = {
      contact: params.contact,
      onlyReturnExisting: params.onlyReturnExisting,
      termsOfServiceAgreed: params.termsOfServiceAgreed
    };
    if (params.externalAccountBinding) {
      newParam.externalAccountBinding = await this.createExternalAccountBinding(params.externalAccountBinding.challenge, params.externalAccountBinding.kid);
    }
    const res = await this.request<Account>(this.getDirectory().newAccount, "POST", newParam, false);
    if (!res.location) {
      throw new Error("Cannot get Location header");
    }
    this.authKey.id = res.location;
    return res;
  }

  /**
   * Update account settings.
   * @param params Updateable parameters
   */
  public async updateAccount(params: AccountUpdateParams) {
    return this.request<Account>(this.getKeyId(), "POST", params);
  }

  /**
   * Account key change
   * @param key New key
   */
  public async changeKey(key?: CryptoKeyPair) {
    const keyChange = {
      account: this.getKeyId(),
      oldKey: await this.exportPublicKey(this.authKey.key),
    };
    const innerToken = await this.createJWS(keyChange, { omitNonce: true, url: this.getDirectory().keyChange, key });
    const res = await this.request<Account>(this.getDirectory().keyChange, "POST", innerToken);
    if (key) {
      this.authKey.key = key;
    }
    return res;
  }

  /**
   * Certificate revocation.
   * @param certificate
   * @param reason Reason for feedback
   */
  public async revoke(certificate: BufferSource, reason?: RevocationReason) {
    return this.request(this.getDirectory().revokeCert, "POST", {
      certificate: Convert.ToBase64Url(certificate),
      reason,
    });
  }

  /**
   * Account deactivation.
   * changes account status to deactivated
   */
  public async deactivateAccount() {
    return this.deactivate<Account>(this.getKeyId());
  }

  /**
   * Authorization deactivation.
   * changes authorization status to deactivated
   */
  public async deactivateAuthorization() {
    return this.deactivate<Authorization>(this.getKeyId());
  }

  /**
   * Deactivation Request
   * @param url Deactivation element URL
   */
  public async deactivate<T>(url: string) {
    return this.request<T>(url, "POST", { status: "deactivated" });
  }

  /**
   * Request for ACME server
   * @param url адресс сервера ACME
   * @param method default "GET"
   * @param params
   * @param options
   * @param kid dafeult true
   */
  public async request<T>(
    url: string,
    method: Method = "GET",
    params?: any,
    kid = true): Promise<PostResult<T>> {
    if (!this.lastNonce) {
      this.lastNonce = await this.nonce();
    }
    if (!params || method === "GET") {
      params = "";
    }
    const token = kid
      ? await this.createJWS(params, Object.assign({ url }, { kid: this.getKeyId() }))
      : await this.createJWS(params, Object.assign({ url }));
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/jose+json",
      },
      body: JSON.stringify(token),
    });
    this.lastNonce = response.headers.get("replay-nonce") || "";
    const headers: Headers = {
      link: response.headers.get("link") || undefined,
      location: response.headers.get("location") || undefined,
    };
    if (!(response.status >= 200 && response.status < 300)) {
      // TODO: throw exception
      // TODO: Detect ACME exception
      const error = await response.text();
      let errJson: any;
      try {
        errJson = JSON.parse(error);
        this.logResponse(url, errJson, method);
      } catch (ex) {
        throw new Error(error);
      }
      throw new AcmeError(errJson);
    }
    let result: any;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/pem-certificate-chain")) {
      result = await response.text();
    } else if (contentType) {
      result = await response.json();
    }
    const res: PostResult = {
      status: response.status,
      ...headers,
      result,
    };

    this.logResponse(url, res, method);

    return res;
  }

  /**
   * Create a new order.
   * Returns an existing order if the identifiers parameter matches
   * @param params
   */
  public async newOrder(params: OrderCreateParams) {
    return this.request<Order>(this.getDirectory().newOrder, "POST", params);
  }

  /**
   * Getting data about challenge.
   * The POST method starts checking on the ACME server side.
   * @param url адресс сhallenge
   * @param method метод вызова
   */
  public async getChallenge(url: string, method: Method = "GET") {
    const res = await this.request<Challenge>(url, method, {}); //{}
    if (method === "POST") {
      await this.pause(2000);
    }
    return res;
  }

  /**
   * Order finalize
   * @param url
   * @param params
   */
  public async finalize(url: string, params: Finalize) {
    return this.request<Order>(url, "POST", params);
  }

  /**
   * Retrieving Authorization Data
   * @param url адрес авторизации
   * @param method метод вызова
   */
  public async getAuthorization(url: string, method: Method = "GET") {
    return this.request<Authorization>(url, method);
  }

  /**
   * Obtaining a certificate of a complete order
   * @param url
   * @param method
   */
  public async getCertificate(url: string, method: Method = "POST") {
    const response = await this.request<string>(url, method);
    const certs = PemConverter.decode(response.result);
    const res: PostResult<ArrayBuffer[]> = {
      link: response.link,
      location: response.location,
      result: certs,
      status: response.status,
    };
    return res;
  }

  /**
   * Creation JWS.
   * @param payload
   * @param options
   */
  public async createJWS(payload: any, options: CreateJwsOptions) {
    const jws = new JsonWebSignature(this.crypto);
    const key = options.key || this.authKey.key;
    const header = jws.getProtected();

    if (options.url) {
      header.url = options.url;
    }
    if (!options.omitNonce) {
      header.nonce = this.lastNonce;
    }

    if (this.isCryptoKeyPair(key)) {
      if (!options.kid) {
        header.jwk = await this.crypto.subtle.exportKey("jwk", key.publicKey);
      } else {
        header.kid = options.kid;
      }
      const alg = { ...key.privateKey.algorithm, hash: this.hash };
      await jws.sign(alg, key.privateKey);
    } else {
      await jws.sign({ name: "HMAC" }, key);
    }
    return jws.toJSON() as Token;
  }

  /**
   * Getting an account id.
   */
  public getKeyId() {
    if (!this.authKey.id) {
      throw new Error("Create or Find account first");
    }
    return this.authKey.id;
  }

  /**
   * Getting the public key.
   * @param key
   */
  public async exportPublicKey(key?: CryptoKeyPair) {
    key = key || this.authKey.key;
    let jwk = await crypto.subtle.exportKey("jwk", key.publicKey);
    delete jwk.d;
    const publicKey = await crypto.subtle.importKey("jwk", jwk, key.publicKey.algorithm as any, true, ["verify"]);
    jwk = await crypto.subtle.exportKey("jwk", publicKey);
    // delete jwk.alg;
    return jwk;
  }

  /**
   * Returns a list of ACME server controllers.
   */
  public getDirectory() {
    if (!this.directory) {
      throw new Error("Call 'initialize' method fist");
    }
    return this.directory;
  }

  /**
   * Getting replay-nonce parameter response from the header
   * @param response
   */
  private getNonce(response: Response) {
    const res = response.headers.get("replay-nonce");
    if (!res) {
      throw new Error("Cannot get Replay-nonce header");
    }
    return res;
  }

  /**
   * Causes a time delay of a specified number of ms
   * @param ms
   */
  public async pause(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Logging responses from the ACME server
   * @param url
   * @param res
   * @param method
   */
  private logResponse(url: string, res: any, method: string) {
    if (this.debug) {
      console.log(`${method} RESPONSE ${url}`);
      console.log("Result", res);
    }
  }

  public async createExternalAccountBinding(challenge: string, kid: string) {
    // Create externalAccountBinding
    const hmac = await crypto.subtle.importKey(
      "raw",
      Convert.FromBase64Url(challenge), // challenge password from AEG portal
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign"]);
    const jwk = await this.exportPublicKey(); // ACME client authorization public key
    const externalAccountBinding = await this.createJWS(jwk, {
      omitNonce: true,
      key: hmac,
      kid, // kid, ACME server uses it for HMAC getting
      // for signature verification
    });
    return externalAccountBinding;
  }

  private isCryptoKeyPair(data: any): data is CryptoKeyPair {
    return data && data.privateKey && data.publicKey;
  }
}
