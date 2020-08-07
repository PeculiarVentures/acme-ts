import { Convert } from "pvtsutils";
import { PemConverter, Response, Content, ContentType } from "@peculiar/acme-core";
import { JsonWebSignature } from "@peculiar/jose";
import { CRLReasons } from "@peculiar/asn1-x509";
import * as protocol from "@peculiar/acme-protocol";
import { BaseClient, ClientOptions, ApiResponse, RequestParams, AcmeMethod } from "./base";

/**
 * Class of work with ACME servers
 */
export class ApiClient extends BaseClient {

  private _nonce = "";
  private _accountId = "";
  private _directory?: protocol.Directory;

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
    const response = await this.fetch<protocol.Directory>(this.url, {
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

  //#region Account

  /**
   * Create account.
   * To create a new account, you must specify the termsOfServiceAgreed: true parameter.
   * To search for an account, you must specify the parameter onlyReturnExisting: true.
   * @param params Request parameters
   */
  public async newAccount(params: protocol.AccountCreateParams) {
    const newParam: protocol.CreateAccountProtocol = {
      contact: params.contact,
      onlyReturnExisting: params.onlyReturnExisting,
      termsOfServiceAgreed: params.termsOfServiceAgreed
    };
    if (params.externalAccountBinding) {
      newParam.externalAccountBinding = await this.createExternalAccountBinding(params.externalAccountBinding.challenge, params.externalAccountBinding.kid);
    }
    const res = await this.fetch<protocol.Account>(this.getDirectory().newAccount, {
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
  public async updateAccount(params: protocol.AccountUpdateParams) {
    const kid = this.getAccountId();
    return await this.fetch<protocol.Account>(kid, {
      method: "POST",
      kid,
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      body: params,
      convert: (resp) => resp.json(),
    });
  }

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
    const innerToken = new JsonWebSignature({
      protected: {
        url: this.getDirectory().keyChange,
        jwk: await this.getCrypto().subtle.exportKey("jwk", key.publicKey),
      },
      payload: {
        account: kid,
        oldKey: await this.getCrypto().subtle.exportKey("jwk", this.accountKey.publicKey),
      }
    }, this.getCrypto());
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
  //#endregion

  //#region Order

  /**
     * Create a new order.
     * Returns an existing order if the identifiers parameter matches
     * @param params
     */
  public async newOrder(params: protocol.OrderCreateParams) {
    return this.fetch<protocol.Order>(this.getDirectory().newOrder, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      body: params,
      convert: (resp) => resp.json(),
    });
  }

  public async getOrder(orderUrl: string) {
    return this.fetch<protocol.Order>(orderUrl, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      convert: (resp) => resp.json(),
    });
  }

  //#endregion

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
   * Authorization deactivation.
   * changes authorization status to deactivated
   */
  public async deactivateAuthorization() {
    return this.deactivate<protocol.Authorization>(this.getAccountId(), (resp) => resp.json());
  }

  /**
   * Getting data about challenge.
   * The POST method starts checking on the ACME server side.
   * @param url адресс сhallenge
   * @param method метод вызова
   */
  public async getChallenge(url: string, method: AcmeMethod = "POST-as-GET") {
    const res = await this.fetch<protocol.Challenge>(url, {
      method,
      kid: this.getAccountId(),
      nonce: this._nonce,
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
  public async finalize(url: string, params: protocol.Finalize) {
    return this.fetch<protocol.Order>(url, {
      method: "POST",
      kid: this.getAccountId(),
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      body: params,
      convert: (resp) => resp.json(),
    });
  }

  /**
   * Retrieving Authorization Data
   * @param url адрес авторизации
   * @param method метод вызова
   */
  public async getAuthorization(url: string) {
    return this.fetch<protocol.Authorization>(url, {
      method: "POST-as-GET",
      kid: this.getAccountId(),
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      convert: (resp) => resp.json(),
    });
  }

  /**
   * Obtaining a certificate of a complete order
   * @param url
   * @param method
   */
  public async getCertificate(url: string) {
    return await this.fetch<ArrayBuffer[]>(url, {
      method: "POST-as-GET",
      kid: this.getAccountId(),
      nonce: this._nonce,
      key: this.accountKey.privateKey,
      convert: (resp) => {
        if (!resp.content) {
          throw new Error("Cannot get content from ACME response");
        }
        switch (resp.content.type) {
          case ContentType.pemCertificateChain:
            return PemConverter.decode(resp.content.toString());
          case ContentType.pkixCert:
            return [resp.content.content];
          case ContentType.pkcs7Mime:
            throw new Error("Not implemented");
          default:
            throw new Error("Not supported content type for certificate");
        }
      },
    });
  }

  /**
   * Returns a list of ACME server controllers.
   */
  protected getDirectory() {
    if (!this._directory) {
      throw new Error("Call 'initialize' method fist");
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
}
