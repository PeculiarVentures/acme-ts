import * as core from "@peculiar/acme-core";
import * as types from "../services/types";
import { JsonWebKey, JsonWebSignature } from "@peculiar/jose";
import { inject, injectable } from "tsyringe";
import { IAccount, Key } from "@peculiar/acme-data";
import { AccountCreateParams, AccountUpdateParams, ChangeKey, OrderCreateParams, Finalize, RevokeCertificateParams } from "@peculiar/acme-protocol";
import { BaseService, diServerOptions, IServerOptions } from "../services";
import { diLogger, ILogger } from "@peculiar/acme-core";

export const diAcmeController = "ACME.AcmeController";
/**
 * ACME Controller
 *
 * DI: ACME.AcmeController
 */
@injectable()
export class AcmeController extends BaseService {

  public constructor(
    @inject(types.diDirectoryService) protected directoryService: types.IDirectoryService,
    @inject(types.diNonceService) protected nonceService: types.INonceService,
    @inject(types.diConvertService) protected convertService: types.IConvertService,
    @inject(types.diAccountService) protected accountService: types.IAccountService,
    @inject(types.diAuthorizationService) protected authorizationService: types.IAuthorizationService,
    @inject(types.diChallengeService) protected challengeService: types.IChallengeService,
    @inject(types.diOrderService) protected orderService: types.IOrderService,
    @inject(diLogger) logger: ILogger,
    @inject(diServerOptions) options: IServerOptions) {
    super(options, logger);
  }

  protected async wrapAction(action: (response: core.Response) => Promise<void>, request: core.Request, useJwk = false) {
    const response = new core.Response();

    try {
      // TODO Logger.Info("Request {method} {path} {token}", request.Method, request.Path, request.Token);

      if (request.method === "POST") {
        //#region Check JWS
        let account: IAccount | null = null;

        // Parse JWT
        const token = this.getToken(request);

        const header = token.getProtected();

        if (!header.url) {
          throw new core.UnauthorizedError("The JWS header MUST have 'url' field");
        }

        if (useJwk) {
          if (!header.jwk) {
            throw new core.IncorrectResponseError("JWS MUST contain 'jwk' field");
          }
          if (!(await token.verify())) {
            throw new core.UnauthorizedError("JWS signature is invalid");
          }

          account = await this.accountService.findByPublicKey(header.jwk);
          // If a server receives a POST or POST-as-GET from a deactivated account, it MUST return an error response with status
          // code 401(Unauthorized) and type "urn:ietf:params:acme:error:unauthorized"
          if (account && account.status !== "valid") {
            throw new core.UnauthorizedError(`Account is not valid. Status is '${account.status}'`);
          }
        }
        else {
          if (!header.kid) {
            throw new core.IncorrectResponseError("JWS MUST contain 'kid' field");
          }

          account = await this.accountService.getById(this.getKeyIdentifier(header.kid));

          const key = await new JsonWebKey(this.options.cryptoProvider, account.key).exportKey();
          if (!token.verify(key)) {
            throw new core.UnauthorizedError("JWS signature is invalid");
          }

          // Once an account is deactivated, the server MUST NOT accept further
          // requests authorized by that account's key
          // https://tools.ietf.org/html/rfc8555#section-7.3.6
          if (account.status !== "valid") {
            throw new core.UnauthorizedError(`Account is not valid. Status is '${account.status}'`);
          }
        }
        //#endregion

        //#region Check Nonce
        const nonce = header.nonce;
        if (!nonce) {
          throw new core.BadNonceError();
        }
        await this.nonceService.validate(nonce);

        //#endregion;
      }

      // Invoke action
      await action(response);
    }
    catch (e) {
      //todo delete
      console.error(e);

      if (e instanceof core.AcmeError) {
        response.status = e.status;
        response.content = new core.Content(e, this.options.formattedResponse);

        // TODO Logger.Error(e);
      } else if (e) {
        response.status = core.HttpStatusCode.internalServerError;
        const error = new core.AcmeError(core.ErrorType.serverInternal, `Unexpected server error exception. ${e.message || e}`, core.HttpStatusCode.internalServerError, e);
        response.content = new core.Content(error, this.options.formattedResponse);

        // TODO Logger.Error(e);
      }

      // TODO Logger.Info("Response {@response}", response);

    }
    return response;
  }

  private getToken(request: core.Request) {
    const token = request.body;
    if (!token || !Object.keys(token).length) {
      throw new core.MalformedError("JSON Web Token is empty");
    }
    const jws = new JsonWebSignature({}, this.options.cryptoProvider);
    jws.fromJSON(token);
    return jws;
  }

  public keyChange(request: core.Request) {
    return this.wrapAction(async (response) => {
      const token = this.getToken(request);
      const reqProtected = token.getProtected();

      // Validate the POST request belongs to a currently active account, as described in Section 6.
      const account = await this.getAccount(request);
      const key = new JsonWebKey(this.options.cryptoProvider, account.key);
      if (!token || token && !token.verify(key.getPublicKey())) {
        throw new core.MalformedError();
      }

      // Check that the payload of the JWS is a well - formed JWS object(the "inner JWS").
      const innerJWS = token.getPayload<JsonWebSignature>();
      const innerProtected = innerJWS.getProtected();

      // Check that the JWS protected header of the inner JWS has a "jwk" field.
      const jwkReq = innerProtected.jwk;
      if (!jwkReq) {
        throw new core.MalformedError("The inner JWS hasn't a 'jwk' field");
      }
      const jwk = new JsonWebKey(this.options.cryptoProvider, jwkReq);
      // Check that the inner JWS verifies using the key in its "jwk" field.
      if (!innerJWS.verify(jwk.getPublicKey())) {
        throw new core.MalformedError("The inner JWT not verified");
      }

      // Check that the payload of the inner JWS is a well-formed keyChange object (as described above).
      const param = innerJWS.tryGetPayload<ChangeKey>();
      if (!param) {
        throw new core.MalformedError("The payload of the inner JWS is not a well-formed keyChange object");
      }

      // Check that the "url" parameters of the inner and outer JWSs are the same.
      if (reqProtected.url !== innerProtected.url) {
        throw new core.MalformedError("The 'url' parameters of the inner and outer JWSs are not the same");
      }

      // Check that the "account" field of the keyChange object contains the URL for the account matching the old key (i.e., the "kid" field in the outer JWS).
      if (reqProtected.kid !== param.account) {
        throw new core.MalformedError("The 'account' field not contains the URL for the account matching the old key");
      }

      // Check that the "oldKey" field of the keyChange object is the same as the account key for the account in question.
      const testAccount = await this.accountService.getByPublicKey(new JsonWebKey(this.options.cryptoProvider, param.oldKey));
      if (testAccount.id !== account.id) {
        throw new core.MalformedError("The 'oldKey' is the not same as the account key");
      }

      // TODO Check that no account exists whose account key is the same as the key in the "jwk" header parameter of the inner JWS.
      // in repository

      try {
        const updatedAccount = await this.accountService.changeKey(account.id, jwk);
        response.content = new core.Content(await this.convertService.toAccount(updatedAccount));
        response.headers.location = `${this.options.baseAddress}acct/${updatedAccount.id}`;
        response.status = 200; // Ok
      }
      catch (e) {
        if (e.StatusCode === 409) {
          const conflictAccount = await this.accountService.getByPublicKey(jwk);
          response.headers.location = `${this.options.baseAddress}acct/${conflictAccount.id}`;
        }
        throw e;
      }
    }, request);
  }

  public async getDirectory(request: core.Request) {
    return this.wrapAction(async (response) => {
      const data = await this.directoryService.getDirectory();
      response.content = new core.Content(data, this.options.formattedResponse);
      response.status = 200; // Ok
    }, request);
  }

  public async getNonce(request: core.Request) {
    return this.wrapAction(async (response) => {
      response.headers.replayNonce = await this.nonceService.create();
      if (!request.method || request.method !== "HEAD") {
        response.status = 204; // No content
      }
    }, request);
  }

  //#region Account management
  public async newAccount(request: core.Request) {
    return this.wrapAction(async (response) => {
      const token = this.getToken(request);
      const header = token.getProtected();
      const params = token.getPayload<AccountCreateParams>();
      let account = await this.accountService.findByPublicKey(header.jwk!);

      if (params.onlyReturnExisting) {
        if (!account) {
          throw new core.AccountDoesNotExistError();
        }
        response.content = new core.Content(await this.convertService.toAccount(account), this.options.formattedResponse);
        response.status = core.HttpStatusCode.ok;
      }
      else {
        if (!account) {
          // Create new account
          account = await this.accountService.create( new JsonWebKey(this.options.cryptoProvider, header.jwk!), params);
          response.content = new core.Content(await this.convertService.toAccount(account), this.options.formattedResponse);
          response.status = 201; // Created
        }
        else {
          // Existing account
          response.content = new core.Content(await this.convertService.toAccount(account), this.options.formattedResponse);
        }
      }

      response.headers.location = `${this.options.baseAddress}/acct/${account.id}`;
    }, request, true);
  }

  protected async getAccount(request: core.Request) {
    const token = this.getToken(request);
    const header = token.getProtected();

    if (!header.kid) {
      throw new core.MalformedError("Request has no kid");
    }

    const account = await this.accountService.getById(this.getIdFromLink(header.kid));

    if (account.status === "deactivated") {
      throw new core.UnauthorizedError("Account deactivated");
    }
    return account;
  }

  public getIdFromLink(url: string) {
    const pattern = /\/(\d+)$/g;
    const match = pattern.exec(url);
    if (!match) {
      throw new core.MalformedError(`Cannot get Id from link ${url}`);
    }

    return +match[1];
  }

  public assertAccountStatus(account: IAccount) {
    if (account.status === "deactivated") {
      throw new core.UnauthorizedError("Account deactivated");
    }
  }

  public async postAccount(request: core.Request) {
    return this.wrapAction(async (response) => {
      const token = this.getToken(request);
      const params = token.getPayload<AccountUpdateParams>();

      let account = await this.getAccount(request);
      this.assertAccountStatus(account);

      if (params.status) {
        // Deactivate
        if (params.status !== "deactivated") {
          throw new core.MalformedError("Request paramter status must be 'deactivated'");
        }

        account = await this.accountService.deactivate(account.id);
      }
      else {
        // Update
        account = await this.accountService.update(account.id, params);
      }

      response.headers.location = `${this.options.baseAddress}acct/${account.id}`;
      response.content = new core.Content( await this.convertService.toAccount(account));
    }, request, true);
  }
  //#endregion

  //#region Order management
  public createOrder(request: core.Request) {
    return this.wrapAction(async (response) => {
      const token = this.getToken(request);
      // get account
      const account = await this.getAccount(request);

      // get params
      const params = token.getPayload<OrderCreateParams>();

      // get order
      let order = await this.orderService.getActual(account.id, params);
      if (!order) {
        // create order
        order = await this.orderService.create(account.id, params);
        response.status = 201; // Created
      }

      // add headers
      response.headers.location = new URL(`order/${order.id}`, this.options.baseAddress).toString();

      // convert to JSON
      response.content = new core.Content(await this.convertService.toOrder(order), this.options.formattedResponse);
    }, request);
  }

  public postOrder(request: core.Request, orderId: Key) {
    return this.wrapAction(async (response) => {
      // get account
      const account = await this.getAccount(request);

      // get order
      const order = await this.orderService.getById(account.id, orderId);

      // add headers
      response.headers.location = new URL(`order/${order.id}`, this.options.baseAddress).toString();

      // convert to JSON
      response.content = new core.Content(await this.convertService.toOrder(order), this.options.formattedResponse);
    }, request);
  }

  public postOrders(request: core.Request) {
    return this.wrapAction(async (response) => {
      // get account
      const account = await this.getAccount(request);

      // get orders
      const params = request.queryParams;
      const orderList = await this.orderService.getList(account.id, params);

      // Create query link
      let addingString = "";
      if (Object.keys(params).length) {
        for (const key in params) {
          if (Object.prototype.hasOwnProperty.call(params, key)) {
            const element = params[key];
            if (element && key !== "cursor") {
              element.forEach(value => {
                addingString += `&${key}=${value}`;
              });
            }
          }
        }
      }

      // Add links
      const link = `${this.options.baseAddress}orders`;
      let page = 0;
      if (params.cursor) {
        page = Number.parseInt(params.cursor.find(o => o) || "0", 10);
      }
      if (page > 0) {
        response.headers.link?.push(`<${link}?cursor=${page - 1}${addingString}; rel=previous"`);
      }
      if (orderList.next) {
        response.headers.link?.push(`<${link}?cursor=${page + 1}${addingString}>; rel="next";`);
      }

      response.content = new core.Content(await this.convertService.toOrderList(orderList.items), this.options.formattedResponse);
    }, request);
  }

  public finalizeOrder(request: core.Request, orderId: Key) {
    return this.wrapAction(async (response) => {
      const token = this.getToken(request);

      // get account
      const account = await this.getAccount(request);

      // enroll certificate
      const params = token.getPayload<Finalize>();
      const order = await this.orderService.enrollCertificate(account.id, orderId, params);

      // add headers
      response.headers.location = new URL(`order/${order.id}`, this.options.baseAddress).toString();
      response.content = new core.Content(await this.convertService.toOrder(order), this.options.formattedResponse);
    }, request);
  }
  //#endregion

  //#region Challenge
  public postChallenge(request: core.Request, challengeId: Key) {
    return this.wrapAction(async (response) => {
      const token = this.getToken(request);
      const account = await this.getAccount(request);

      // get challenge
      const challenge = await this.challengeService.getById(challengeId);
      await this.authorizationService.getById(account.id, challenge.authorizationId);
      if (token.isPayloadEmptyObject()) {
        await this.challengeService.validate(challenge);
      }
      response.content = new core.Content(await this.convertService.toChallenge(challenge));
    }, request);
  }
  //#endregion

  //#region Authorization
  public async postAuthorization(request: core.Request, authId: Key) {
    return this.wrapAction(async (response) => {
      const account = await this.getAccount(request);

      const auth = await this.authorizationService.getById(account.id, authId);

      response.content = new core.Content(await this.convertService.toAuthorization(auth));
    }, request);
  }
  //#endregion

  //#region Certificate management
  public async getCertificate(request: core.Request, thumbprint: string) {
    return this.wrapAction(async (response) => {
      const account = await this.getAccount(request);
      const certs = await this.orderService.getCertificate(account.id, thumbprint);

      switch (this.options.downloadCertificateFormat) {
        case "PemCertificateChain":
          {
            const pem = core.PemConverter.encode(certs.map(o => o.rawData), "certificate");
            response.content = new core.Content(pem);
          }
          break;
        case "PkixCert":
          {
            response.content = new core.Content(certs[0].rawData, "application/pkix-cert");
          }
          break;
        case "Pkcs7Mime":
          {
            throw new Error("Method not implemented");
            //todo https://www.npmjs.com/package/pkijs
            // const x509Certs = certs.map(o => o.rawData);
            // const x509Collection = new X509Certificate2Collection(x509Certs);
            // response.content = new Content(x509Collection.Export(X509ContentType.Pkcs7), "application/pkcs7-mime");
          }
          break;
      }
    }, request);
  }

  public async revokeCertificate(request: core.Request) {
    return this.wrapAction(async (response) => {
      const token = this.getToken(request);
      const header = token.getProtected();
      const params = token.getPayload<RevokeCertificateParams>();
      if (header.kid) {
        const account = await this.getAccount(request);
        await this.orderService.revokeCertificate(account.id, params);
      }
      else if (header.jwk) {
        await this.orderService.revokeCertificate(header.jwk, params);
      } else {
        throw new core.MalformedError("");
      }
      response.status = 204;
    }, request);
  }
  //#endregion


}