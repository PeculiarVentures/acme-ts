import { Request, Response, MalformedError, UnauthorizedError, IncorrectResponseError, BadNonceError, HttpStatusCode, Content, AcmeError, ErrorType, AccountDoesNotExistError } from "@peculiar/acme-core";
import { JsonWebKey, JsonWebSignature } from "@peculiar/jose";
import { inject, injectable } from "tsyringe";
import { diDirectoryService, IDirectoryService, diAccountService, IAccountService, INonceService, diNonceService, IConvertService, diConvertService, IOrderService, diOrderService } from "../services/types";
import { IAccount } from "@peculiar/acme-data";
import { AccountCreateParams, AccountUpdateParams, ChangeKey, OrderCreateParams, Finalize } from "@peculiar/acme-protocol";
import { BaseService, diServerOptions, IServerOptions } from "../services";

export const diAcmeController = "ACME.AcmeController";
/**
 * ACME Controller
 *
 * DI: ACME.AcmeController
 */
@injectable()
export class AcmeController extends BaseService {

  public constructor(
    @inject(diDirectoryService) protected directoryService: IDirectoryService,
    @inject(diNonceService) protected nonceService: INonceService,
    @inject(diConvertService) protected convertService: IConvertService,
    @inject(diAccountService) protected accountService: IAccountService,
    @inject(diOrderService) protected orderService: IOrderService,
    @inject(diServerOptions) options: IServerOptions,
    private crypto: Crypto,
  ) {
    super(options);
  }

  protected async wrapAction(action: (response: Response) => Promise<void>, request: Request, useJwk = false) {
    const response = new Response();

    try {
      // TODO Logger.Info("Request {method} {path} {token}", request.Method, request.Path, request.Token);

      if (request.method == "POST") {
        //#region Check JWS
        let account: IAccount | null = null;

        // Parse JWT
        const token = request.body;
        if (!token) {
          throw new MalformedError("JSON Web Token is empty");
        }

        const header = token.getProtected();

        if (!header.url) {
          throw new UnauthorizedError("The JWS header MUST have 'url' field");
        }

        if (useJwk) {
          if (!header.jwk) {
            throw new IncorrectResponseError("JWS MUST contain 'jwk' field");
          }
          if (token.verify()) {
            throw new UnauthorizedError("JWS signature is invalid");
          }

          account = await this.accountService.findByPublicKey(header.jwk);
          // If a server receives a POST or POST-as-GET from a deactivated account, it MUST return an error response with status
          // code 401(Unauthorized) and type "urn:ietf:params:acme:error:unauthorized"
          if (account && account.status !== "valid") {
            throw new UnauthorizedError(`Account is not valid. Status is '${account.status}'`);
          }
        }
        else {
          if (!header.kid) {
            throw new IncorrectResponseError("JWS MUST contain 'kid' field");
          }

          account = await this.accountService.getById(this.getKeyIdentifier(header.kid));

          const key = await new JsonWebKey(this.crypto, account.key).exportKey();
          if (!token.verify(key)) {
            throw new UnauthorizedError("JWS signature is invalid");
          }

          // Once an account is deactivated, the server MUST NOT accept further
          // requests authorized by that account's key
          // https://tools.ietf.org/html/rfc8555#section-7.3.6
          if (account.status !== "valid") {
            throw new UnauthorizedError(`Account is not valid. Status is '${account.status}'`);
          }
        }
        //#endregion

        //#region Check Nonce
        const nonce = header.nonce;
        if (!nonce) {
          throw new BadNonceError();
        }
        await this.nonceService.validate(nonce);

        //#endregion;
      }

      // Invoke action
      await action(response);
    }
    catch (e) {
      if (e instanceof AcmeError) {
        response.status = e.status;
        response.content = new Content(e, this.options.formattedResponse);

        // TODO Logger.Error(e);
      } else if (e) {
        response.status = HttpStatusCode.internalServerError;
        const error = new AcmeError(ErrorType.serverInternal, `Unexpected server error exception. ${e.message || e}`, HttpStatusCode.internalServerError, e);
        response.content = new Content(error, this.options.formattedResponse);

        // TODO Logger.Error(e);
      }

      // TODO Logger.Info("Response {@response}", response);

    }
    return response;
  }

  public keyChange(request: Request) {
    return this.wrapAction(async (response) => {
      const reqProtected = request.body!.getProtected();

      // Validate the POST request belongs to a currently active account, as described in Section 6.
      const account = await this.getAccount(request);
      const jws = request.body;
      const key = new JsonWebKey(this.crypto, account.key);
      if (!jws || jws && !jws.verify(key.getPublicKey())) {
        throw new MalformedError();
      }

      // Check that the payload of the JWS is a well - formed JWS object(the "inner JWS").
      const innerJWS = request.body!.getPayload<JsonWebSignature>();
      const innerProtected = innerJWS.getProtected();

      // Check that the JWS protected header of the inner JWS has a "jwk" field.
      const jwkReq = innerProtected.jwk;
      if (!jwkReq) {
        throw new MalformedError("The inner JWS hasn't a 'jwk' field");
      }
      const jwk = new JsonWebKey(this.crypto, jwkReq);
      // Check that the inner JWS verifies using the key in its "jwk" field.
      if (!innerJWS.verify(jwk.getPublicKey())) {
        throw new MalformedError("The inner JWT not verified");
      }

      // Check that the payload of the inner JWS is a well-formed keyChange object (as described above).
      const param = innerJWS.tryGetPayload<ChangeKey>();
      if (!param) {
        throw new MalformedError("The payload of the inner JWS is not a well-formed keyChange object");
      }

      // Check that the "url" parameters of the inner and outer JWSs are the same.
      if (reqProtected.url !== innerProtected.url) {
        throw new MalformedError("The 'url' parameters of the inner and outer JWSs are not the same");
      }

      // Check that the "account" field of the keyChange object contains the URL for the account matching the old key (i.e., the "kid" field in the outer JWS).
      if (reqProtected.kid !== param.account) {
        throw new MalformedError("The 'account' field not contains the URL for the account matching the old key");
      }

      // Check that the "oldKey" field of the keyChange object is the same as the account key for the account in question.
      const testAccount = await this.accountService.getByPublicKey(param.oldKey);
      if (testAccount.id !== account.id) {
        throw new MalformedError("The 'oldKey' is the not same as the account key");
      }

      // TODO Check that no account exists whose account key is the same as the key in the "jwk" header parameter of the inner JWS.
      // in repository

      try {
        const updatedAccount = await this.accountService.changeKey(account.id, jwk);
        response.content = new Content(this.convertService.toAccount(updatedAccount));
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

  public async getDirectory(request: Request) {
    return this.wrapAction(async (response) => {
      const data = await this.directoryService.getDirectory();
      response.content = new Content(data, this.options.formattedResponse);
      response.status = 200; // Ok
    }, request);
  }

  public async getNonce(request: Request) {
    return this.wrapAction(async (response) => {
      response.headers.replayNonce = await this.nonceService.create();
      if (!request.method || request.method !== "HEAD") {
        response.status = 204; // No content
      }
    }, request);
  }

  //#region Account management
  public async newAccount(request: Request) {
    return this.wrapAction(async (response) => {
      const header = request.body!.getProtected();
      const params = request.body!.getPayload<AccountCreateParams>();
      let account = await this.accountService.findByPublicKey(header.jwk!);

      if (params.onlyReturnExisting) {
        if (!account) {
          throw new AccountDoesNotExistError();
        }
        response.content = new Content(this.convertService.toAccount(account), this.options.formattedResponse);
        response.status = HttpStatusCode.ok;
      }
      else {
        if (!account) {
          // Create new account
          account = await this.accountService.create(header.jwk!, params);
          response.content = new Content(this.convertService.toAccount(account), this.options.formattedResponse);
          response.status = 201; // Created
        }
        else {
          // Existing account
          response.content = new Content(this.convertService.toAccount(account), this.options.formattedResponse);
          response.status = 200; // Ok
        }
      }

      response.headers.location = `{Options.BaseAddress}/acct/{account.Id}`;
    }, request, true);
  }

  protected async getAccount(request: Request) {
    const header = request.body!.getProtected();

    if (!header.kid) {
      throw new MalformedError("Request has no kid");
    }

    const account = await this.accountService.getById(this.getIdFromLink(header.kid));

    if (account.status === "deactivated") {
      throw new UnauthorizedError("Account deactivated");
    }
    return account;
  }

  public getIdFromLink(url: string) {
    const pattern = /\/(\\d+)$/g;
    const match = pattern.exec(url);
    if (!match) {
      throw new MalformedError(`Cannot get Id from link ${url}`);
    }

    return +match[1];
  }

  public assertAccountStatus(account: IAccount) {
    if (account.status === "deactivated") {
      throw new UnauthorizedError("Account deactivated");
    }
  }

  public postAccount(request: Request) {
    return this.wrapAction(async (response) => {
      const params = request.body!.getPayload<AccountUpdateParams>();

      let account = await this.getAccount(request);
      this.assertAccountStatus(account);

      if (params.status) {
        // Deactivate
        if (params.status !== "deactivated") {
          throw new MalformedError("Request paramter status must be 'deactivated'");
        }

        account = await this.accountService.deactivate(account.id);
      }
      else {
        // Update
        account = await this.accountService.update(account.id, params);
      }

      response.headers.location = `${this.options.baseAddress}acct/${account.id}`;
      response.content = new Content(this.convertService.toAccount(account));
    }, request, true);
  }
  //#endregion

  //#region Order management
  public CreateOrder(request: Request) {
    return this.wrapAction(async (response) => {
      // get account
      const account = await this.getAccount(request);

      // get params
      const params = request.body!.getPayload<OrderCreateParams>();

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
      response.content = new Content(this.convertService.toOrder(order), this.options.formattedResponse);
    }, request);
  }

  public PostOrder(request: Request, orderId: number) {
    return this.wrapAction(async (response) => {
      // get account
      const account = await this.getAccount(request);

      // get order
      const order = await this.orderService.getById(account.id, orderId);

      // add headers
      response.headers.location = new URL(`order/${order.id}`, this.options.baseAddress).toString();

      // convert to JSON
      response.content = new Content(this.convertService.toOrder(order), this.options.formattedResponse);
    }, request);
  }

  // public PostOrders(request: Request) {
  //   return this.wrapAction(async (response) => {
  //     // get account
  //     const account = await this.getAccount(request);

  //     // get orders
  //     const params = request.queryParams;
  //     const orderList = await this.orderService.getList(account.id, params);

  //     // Create query link
  //     string addingString = null;
  //     if (params.Count > 0) {
  //       // foreach (var item in params)
  //       // {
  //       //     if (item.Key != "cursor")
  //       //     {
  //       //         foreach (var value in item.Value)
  //       //         {
  //       //             addingString += $"&{item.Key}={value}";
  //       //         }
  //       //     }
  //       // }
  //     }

  //     // Add links
  //     const link = `${this.options.baseAddress}orders`;
  //     let page = 0;
  //     if (params.ContainsKey("cursor")) {
  //       page = int.Parse(params["cursor"].FirstOrDefault());
  //     }
  //     if (page > 0) {
  //       response.headers.link?.push(new  LinkHeader(`${link}?cursor=${page - 1}${addingString}`, new Web.Http.LinkHeaderItem("rel", "previous", true)));
  //     }
  //     if (orderList.nextPage) {
  //       response.headers.link?.push(new LinkHeader(`${link}?cursor=${page + 1}${addingString}`, new Web.Http.LinkHeaderItem("rel", "next", true)));
  //     }

  //     response.content = new Content(this.convertService.toOrderList(orderList), this.options.formattedResponse);
  //   }, request);
  // }

  /// <inheritdoc/>

  public FinalizeOrder(request: Request, orderId: number) {
    return this.wrapAction(async (response) => {
      // get account
      const account = await this.getAccount(request);

      // enroll certificate
      const params = request.body!.getPayload<Finalize>();
      const order = await this.orderService.enrollCertificate(account.id, orderId, params);

      // add headers
      response.headers.location = new URL(`order/${order.id}`, this.options.baseAddress).toString();
      response.content = new Content(this.convertService.toOrder(order), this.options.formattedResponse);
    }, request);
  }
  //#endregion

}