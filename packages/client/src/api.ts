import { Response, Content, ContentType } from "@peculiar/acme-core";
import * as protocol from "@peculiar/acme-protocol";
import { JsonWebSignature, JsonWebKey } from "@peculiar/jose";
import { Convert } from "pvtsutils";
import { BaseClient, ClientOptions, ApiResponse, RequestParams } from "./base";

export interface ExternalAccountBinding {
  /**
   * HMAC key in base64url encoded format
   */
  challenge: string;
  /**
   * URI with key identifier
   */
  kid: string;
}

export interface AccountCreateParams {
  /**
   * List of contacts
   */
  contact?: string[];
  /**
   * Indicates the client's agreement with the terms of service
   */
  termsOfServiceAgreed?: boolean;
  /**
   * External account parameters
   */
  externalAccountBinding?: ExternalAccountBinding;
  /**
   * Indicates that client must return only existing account
   */
  onlyReturnExisting?: boolean;
}

export interface RetryOptions {
  /**
   * Amount of retries. Default is 10
   */
  retries?: number;
  /**
   * Interval duration in ms. Default is 1000
   */
  interval?: number;
}

export enum CRLReasons {
  unspecified = 0,
  keyCompromise = 1,
  cACompromise = 2,
  affiliationChanged = 3,
  superseded = 4,
  cessationOfOperation = 5,
  certificateHold = 6,
  removeFromCRL = 8,
  privilegeWithdrawn = 9,
  aACompromise = 10
}

/**
 * Class of work with ACME servers
 */
export class ApiClient extends BaseClient {
  public static RETRIES = 10;
  public static INTERVAL = 1000;

  /**
   * Creates a new instance of ApiClient
   * @param accountKey Account key pair
   * @param url URI to ACME directory controller
   * @param options Client options
   */
  public static async create(accountKey: CryptoKeyPair, url: string, options?: ClientOptions) {
    const client = new ApiClient(accountKey, url, options);
    client.directory = await client.getDirectory();

    return client;
  }

  /**
   * Last used nonce
   */
  protected nonce = "";
  /**
   * Account id
   */
  protected accountId = "";
  /**
   * Cached directory object
   */
  protected directory!: protocol.Directory;

  protected constructor(
    public accountKey: CryptoKeyPair,
    public url: string,
    options?: ClientOptions) {
    super(options);
  }

  /**
   * Sends request
   * @param url URI
   * @param params Parameters
   */
  protected async fetch<T = Content>(url: string, params: RequestParams<T>) {
    if (params.method === "POST" || params.method === "POST-as-GET") {
      if (!this.nonce) {
        await this.getNonce();
      }
      params.nonce = this.nonce;
      this.nonce = "";
    }

    const resp = await super.fetch(url, params);

    this.readNonce(resp);

    return resp;
  }

  /**
   * Gets a directory object
   */
  public async getDirectory() {
    const response = await this.fetch<protocol.Directory>(this.url, {
      method: "GET",
      convert: (resp) => resp.json(),
    });

    return response.content;
  }

  /**
   * Gets a new nonce
   */
  public async getNonce(method: "GET" | "HEAD" = "HEAD") {
    const response = await this.fetch<null>(this.directory.newNonce, {
      method,
      convert: () => null,
    });
    return this.readNonce(response);
  }

  //#region Account

  /**
   * Create account.
   * To create a new account, you must specify the termsOfServiceAgreed: true parameter.
   * To search for an account, you must specify the parameter onlyReturnExisting: true.
   * @param params Request parameters
   */
  public async newAccount(params: AccountCreateParams) {
    const newParam: protocol.CreateAccountParams = {
      contact: params.contact,
      onlyReturnExisting: params.onlyReturnExisting,
      termsOfServiceAgreed: params.termsOfServiceAgreed
    };
    if (params.externalAccountBinding) {
      newParam.externalAccountBinding = await this.createExternalAccountBinding(params.externalAccountBinding.challenge, params.externalAccountBinding.kid);
    }
    const res = await this.fetch<protocol.Account>(this.directory.newAccount, {
      method: "POST",
      kid: this.accountKey.publicKey,
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      body: newParam,
      convert: (resp) => resp.json(),
    });
    if (!res.headers.location) {
      throw new Error("Cannot get Location header");
    }
    this.accountId = res.headers.location;
    return res;
  }

  /**
   * Update account settings.
   * @param params Updatable parameters
   */
  public async updateAccount(params: protocol.AccountUpdateParams) {
    const kid = this.getAccountId();
    return await this.fetch<protocol.Account>(kid, {
      method: "POST",
      kid,
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      body: params,
      convert: (resp) => resp.json(),
    });
  }

  /**
   * Getting an account id.
   */
  protected getAccountId() {
    if (!this.accountId) {
      throw new Error("Create or Find account first");
    }
    return this.accountId;
  }

  /**
   * Account deactivation.
   * changes account status to deactivated
   */
  public async deactivateAccount() {
    return this.deactivate<protocol.Account>(this.getAccountId(), (resp) => resp.json());
  }

  /**
   * Account key change
   * @param key New key
   */
  public async changeKey(key: CryptoKeyPair) {
    const kid = this.getAccountId();
    const cryptoProvider = this.getCrypto();
    const innerToken = new JsonWebSignature({
      protected: {
        url: this.directory.keyChange,
        jwk: new JsonWebKey(cryptoProvider, await cryptoProvider.subtle.exportKey("jwk", key.publicKey)),
      },
      payload: {
        account: kid,
        oldKey: new JsonWebKey(cryptoProvider, await cryptoProvider.subtle.exportKey("jwk", this.accountKey.publicKey)),
      }
    }, this.getCrypto());
    await innerToken.sign({ hash: this.options.defaultHash, ...key.privateKey.algorithm }, key.privateKey);

    const response = await this.fetch<null>(this.directory.keyChange, {
      method: "POST",
      kid,
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      body: innerToken,
      convert: () => null,
    });

    this.accountKey = key;

    return response;
  }
  //#endregion

  //#region Order

  /**
   * Create a new order.
   * Returns an existing order if the identifiers parameter matches
   * @param params
   */
  public async newOrder(params: protocol.OrderCreateParams) {
    return this.fetch<protocol.Order>(this.directory.newOrder, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      body: params,
      convert: (resp) => resp.json(),
    });
  }

  /**
   * Gets an order by URI
   * @param orderUrl
   */
  public async getOrder(orderUrl: string) {
    return this.fetch<protocol.Order>(orderUrl, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      convert: (resp) => resp.json(),
    });
  }

  /**
   * Waits for order status changing
   * @param order Order
   * @param options Retry options
   */
  public async retryOrder(order: ApiResponse<protocol.Order>, options?: RetryOptions): Promise<ApiResponse<protocol.Order>>;
  /**
   * Waits for order status changing
   * @param url Order URI
   * @param options Retry options
   */
  public async retryOrder(url: string, options?: RetryOptions): Promise<ApiResponse<protocol.Order>>;
  public async retryOrder(param: string | ApiResponse<protocol.Order>, options: RetryOptions = {}) {
    let order = typeof param === "string"
      ? await this.getOrder(param)
      : param;
    let retries = options.retries || ApiClient.RETRIES;
    while (retries--) {
      if (!order.headers.location) {
        throw new Error("Cannot get location header from Order response");
      }
      order = await this.getOrder(order.headers.location);
      if (order.content.status !== "processing") {
        break;
      }
      await this.pause(options.interval || ApiClient.INTERVAL);
    }

    return order;
  }

  //#endregion

  /**
   * Certificate revocation
   * @param certificate
   * @param reason Reason for feedback
   */
  public async revoke(certificate: BufferSource, reason = CRLReasons.unspecified) {
    return await this.fetch(this.directory.revokeCert, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      body: {
        certificate: Convert.ToBase64Url(certificate),
        reason,
      },
      convert: () => null,
    });
  }

  /**
   * Deactivation Request
   * @param url Deactivation element URL
   * @param convert Convert callback
   */
  protected async deactivate<T>(url: string, convert: (resp: Response) => T) {
    return this.fetch(url, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      body: { status: "deactivated" },
      convert,
    });
  }

  /**
   * Deactivates an authorization
   * @param authzId Authorization URI
   */
  public async deactivateAuthorization(authzId: string) {
    return this.deactivate<protocol.Authorization>(authzId, (resp) => resp.json());
  }

  /**
   * Getting data about challenge.
   * The POST method starts checking on the ACME server side.
   * @param url Challenge URI
   * @param method Method selector
   */
  public async getChallenge(url: string, method: "POST" | "POST-as-GET" = "POST-as-GET") {
    const res = await this.fetch<protocol.Challenge>(url, {
      method,
      kid: this.getAccountId(),
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      body: method === "POST" ? {} : undefined,
      convert: (resp) => resp.json(),
    });
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
  public async finalize(url: string, params: protocol.FinalizeParams) {
    return this.fetch<protocol.Order>(url, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      body: params,
      convert: (resp) => resp.json(),
    });
  }

  /**
   * Retrieving Authorization Data
   * @param url Authorization URI
   */
  public async getAuthorization(url: string) {
    return this.fetch<protocol.Authorization>(url, {
      method: "POST-as-GET",
      kid: this.getAccountId(),
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      convert: (resp) => resp.json(),
    });
  }

  public async retryAuthorization(order: ApiResponse<protocol.Authorization>, options?: RetryOptions): Promise<ApiResponse<protocol.Authorization>>;
  public async retryAuthorization(url: string, options?: RetryOptions): Promise<ApiResponse<protocol.Authorization>>;
  public async retryAuthorization(param: string | ApiResponse<protocol.Authorization>, options: RetryOptions = {}) {
    let authz = typeof param === "string"
      ? await this.getOrder(param)
      : param;
    let retries = options.retries || ApiClient.RETRIES;
    while (retries--) {
      if (!authz.headers.location) {
        throw new Error("Cannot get location header from Authorization response");
      }
      authz = await this.getAuthorization(authz.headers.location);
      if (authz.content.status !== "pending") {
        break;
      }
      await this.pause(options.interval || ApiClient.INTERVAL);
    }

    return authz;
  }

  /**
   * Obtaining a certificate of a complete order
   * @param url
   */
  public async getCertificate(url: string) {
    return await this.fetch<ArrayBuffer[]>(url, {
      method: "POST-as-GET",
      kid: this.getAccountId(),
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      convert: (resp) => {
        if (!resp.content) {
          throw new Error("Cannot get content from ACME response");
        }
        switch (resp.content.type) {
          case ContentType.pem:
            return this.decodePem(resp.content.toString());
          case ContentType.pkix:
            return [resp.content.content];
          case ContentType.pkcs7:
            throw new Error("Not implemented");
          default:
            throw new Error("Not supported content type for certificate");
        }
      },
    });
  }

  public async getEndpoint(url: string) {
    return this.fetch<protocol.Endpoint>(url, {
      method: "POST-as-GET",
      kid: this.getAccountId(),
      nonce: this.nonce,
      key: this.accountKey.privateKey,
      convert: (resp) => resp.json(),
    });
  }

  /**
   * Getting replay-nonce parameter response from the header
   * @param response
   */
  protected readNonce(response: ApiResponse<any>) {
    const res = response.headers.replayNonce;
    this.nonce = res || "";

    return res;
  }

  /**
   * Causes a time delay of a specified number of ms
   * @param ms
   */
  public async pause(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async createExternalAccountBinding(challenge: string, kid: string) {
    // Create externalAccountBinding
    const hmac = await this.getCrypto().subtle.importKey(
      "raw",
      Convert.FromBase64Url(challenge), // challenge password from AEG portal
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign"]);
    const jwk = await this.getCrypto().subtle.exportKey("jwk", this.accountKey.publicKey);
    const externalAccountBinding = new JsonWebSignature({
      protected: {
        kid,
      },
      payload: jwk,
    }, this.getCrypto());
    await externalAccountBinding.sign(hmac.algorithm, hmac, this.getCrypto());
    return externalAccountBinding;
  }

  protected decodePem(pem: string): ArrayBuffer[] {
    const pattern = /-{5}BEGIN [A-Z0-9 ]+-{5}([a-zA-Z0-9=+/\n\r]+)-{5}END [A-Z0-9 ]+-{5}/g;

    const res: ArrayBuffer[] = [];
    let matches: RegExpExecArray | null = null;
    // eslint-disable-next-line no-cond-assign
    while (matches = pattern.exec(pem)) {
      const base64 = matches[1]
        .replace(/[\r\n]/g, "");
      res.push(Convert.FromBase64(base64));
    }

    return res;
  }
}
