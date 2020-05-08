import { Convert } from "pvtsutils";
import { PemConverter, AcmeError, JsonWebSignature } from "@peculiar/acme-core";
import { CRLReasons } from "@peculiar/asn1-x509";
import { Directory, Authorization, Account, Order, AccountCreateParams, AccountUpdateParams, OrderCreateParams, Challenge, Finalize, Token, CreateAccountProtocol } from "@peculiar/acme-protocol";
import { RequestMethod, Response, HttpStatusCode, Headers, Content } from "packages/core/src/web";
import { BaseClient, ClientOptions, ApiResponse, RequestParams } from "./base";

/**
 * Class of work with ACME servers
 */
export class ApiClient extends BaseClient {

  private _nonce = "";
  private _accountId = "";
  private _directory?: Directory;

  public constructor(
    public accountKey: CryptoKeyPair,
    public url: string,
    options?: ClientOptions) {
    super(options);
  }

  protected async fetch<T = Content>(url: string, params: RequestParams<T>) {
    if (params.method === "POST" || params.method === "POST-as-GET") {
      if (!this._nonce) {
        await this.nonce();
      }
      params.nonce = this._nonce;
      this._nonce = "";
    }

    return await super.fetch(url, params);
  }

  /**
   * Retrieving a list of controllers from an ACME server
   * @param url ACME Server Controller List Issue URL
   */
  public async initialize() {
    const response = await this.fetch<Directory>(this.url, {
      method: "GET",
      convert: (resp) => resp.json(),
    });
    this._directory = response.content;
    return this._directory;
  }

  /**
   * Confirmation Code Request
   */
  public async nonce(method: "GET" | "HEAD" = "HEAD") {
    const response = await this.fetch<null>(this.getDirectory().newNonce, {
      method,
      convert: () => null,
    });
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
    const res = await this.fetch<Account>(this.getDirectory().newAccount, {
      method: "POST",
      kid: this.accountKey.publicKey,
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      body: newParam,
      convert: (resp) => resp.json(),
    });
    if (!res.headers.location) {
      throw new Error("Cannot get Location header");
    }
    this._accountId = res.headers.location;
    return res;
  }

  /**
   * Update account settings.
   * @param params Updateable parameters
   */
  public async updateAccount(params: AccountUpdateParams) {
    const kid = this.getAccountId();
    return await this.fetch<Account>(kid, {
      method: "POST",
      kid,
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      body: params,
      convert: (resp) => resp.json(),
    });
  }

  /**
   * Account key change
   * @param key New key
   */
  public async changeKey(key: CryptoKeyPair) {
    const kid = this.getAccountId();
    const innerToken = new JsonWebSignature({
      protected: {
        url: this.getDirectory().keyChange,
        jwk: await this.getCrypto().subtle.exportKey("jwk", key.publicKey),
      },
      payload: {
        account: kid,
        oldKey: await this.getCrypto().subtle.exportKey("jwk", this.accountKey.publicKey),
      }
    });
    await innerToken.sign({ hash: this.options.defaultHash, ...key.privateKey.algorithm }, key.privateKey);

    const response = await this.fetch<null>(this.getDirectory().keyChange, {
      method: "POST",
      kid,
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      body: innerToken,
      convert: () => null,
    });

    this.accountKey = key;

    return response;
  }

  /**
   * Certificate revocation.
   * @param certificate
   * @param reason Reason for feedback
   */
  public async revoke(certificate: BufferSource, reason = CRLReasons.unspecified) {
    return await this.fetch(this.getDirectory().keyChange, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this._nonce,
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
   */
  protected async deactivate<T>(url: string, convert: (resp: Response) => T) {
    return this.fetch(url, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      body: { status: "deactivated" },
      convert,
    });
  }

  /**
   * Account deactivation.
   * changes account status to deactivated
   */
  public async deactivateAccount() {
    return this.deactivate<Account>(this.getAccountId(), (resp) => resp.json());
  }

  /**
   * Authorization deactivation.
   * changes authorization status to deactivated
   */
  public async deactivateAuthorization() {
    return this.deactivate<Authorization>(this.getAccountId(), (resp) => resp.json());
  }

  /**
   * Create a new order.
   * Returns an existing order if the identifiers parameter matches
   * @param params
   */
  public async newOrder(params: OrderCreateParams) {
    return this.fetch<Order>(this.getDirectory().newOrder, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      body: params,
      convert: (resp) => resp.json(),
    });
  }

  // /**
  //  * Getting data about challenge.
  //  * The POST method starts checking on the ACME server side.
  //  * @param url адресс сhallenge
  //  * @param method метод вызова
  //  */
  // public async getChallenge(url: string, method: Method = "GET") {
  //   const res = await this.request<Challenge>(url, method, {}); //{}
  //   if (method === "POST") {
  //     await this.pause(2000);
  //   }
  //   return res;
  // }

  // /**
  //  * Order finalize
  //  * @param url
  //  * @param params
  //  */
  // public async finalize(url: string, params: Finalize) {
  //   return this.request<Order>(url, "POST", params);
  // }

  // /**
  //  * Retrieving Authorization Data
  //  * @param url адрес авторизации
  //  * @param method метод вызова
  //  */
  // public async getAuthorization(url: string, method: Method = "GET") {
  //   return this.request<Authorization>(url, method);
  // }

  // /**
  //  * Obtaining a certificate of a complete order
  //  * @param url
  //  * @param method
  //  */
  // public async getCertificate(url: string, method: Method = "POST") {
  //   const response = await this.request<string>(url, method);
  //   const certs = PemConverter.decode(response.result);
  //   const res: PostResult<ArrayBuffer[]> = {
  //     link: response.link,
  //     location: response.location,
  //     result: certs,
  //     status: response.status,
  //   };
  //   return res;
  // }

  /**
   * Getting an account id.
   */
  protected getAccountId() {
    if (!this._accountId) {
      throw new Error("Create or Find account first");
    }
    return this._accountId;
  }

  /**
   * Returns a list of ACME server controllers.
   */
  protected getDirectory() {
    if (!this._directory) {
      throw new Error("Call 'getDirectory' method fist");
    }
    return this._directory;
  }

  /**
   * Getting replay-nonce parameter response from the header
   * @param response
   */
  protected getNonce(response: ApiResponse<any>) {
    const res = response.headers.replayNonce;
    if (!res) {
      throw new Error("Cannot get Replay-nonce header");
    }
    this._nonce = res;
    return res;
  }

  /**
   * Causes a time delay of a specified number of ms
   * @param ms
   */
  public async pause(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // /**
  //  * Logging responses from the ACME server
  //  * @param url
  //  * @param res
  //  * @param method
  //  */
  // private logResponse(url: string, res: any, method: string) {
  //   if (this.debug) {
  //     console.log(`${method} RESPONSE ${url}`);
  //     console.log("Result", res);
  //   }
  // }

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
    });
    await externalAccountBinding.sign(hmac.algorithm, hmac, this.getCrypto());
    return externalAccountBinding;
  }
}
