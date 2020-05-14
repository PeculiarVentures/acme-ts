import { Request, Response, MalformedError, UnauthorizedError, IncorrectResponseError, JsonWebKey, cryptoProvider, BadNonceError, HttpStatusCode, Content, AcmeError, ErrorType, AccountDoesNotExistError } from "@peculiar/acme-core";
import { inject, injectable } from "tsyringe";
import { diDirectoryService, IDirectoryService, diAccountService, IAccountService, INonceService, diNonceService, IConvertService, diConvertService } from "../services/types";
import { IAccount } from "@peculiar/acme-data";
import { AccountCreateParams } from "@peculiar/acme-protocol";

export const diAcmeController = "ACME.AcmeController";
/**
 * ACME Controller
 *
 * DI: ACME.AcmeController
 */
@injectable()
export class AcmeController {

  public constructor(
    @inject(diDirectoryService) protected directoryService: IDirectoryService,
    @inject(diNonceService) protected nonceService: INonceService,
    @inject(diConvertService) protected convertService: IConvertService,
    @inject(diAccountService) protected accountService: IAccountService,
  ) { }

  protected getKeyIdentifier(kid: string) {
    const res = /\/([^/?]+)\??[^/]*$/.exec(kid)?.[1];
    if (!res) {
      throw new MalformedError("Cannot get key identifier from the 'kid'");
    }
    return res;
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
        if (token == null) {
          throw new MalformedError("JSON Web Token is empty");
        }

        const header = token.getProtected();

        if (header.url == null) {
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

          const key = await new JsonWebKey(account.key).exportKey();
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
        response.content = new Content(e);

        // TODO Logger.Error(e);
      } else if (e) {
        response.status = HttpStatusCode.internalServerError;
        const error = new AcmeError(ErrorType.serverInternal, `Unexpected server error exception. ${e.message || e}`, HttpStatusCode.internalServerError, e);
        response.content = new Content(error);

        // TODO Logger.Error(e);
      }

      // TODO Logger.Info("Response {@response}", response);

    }
    return response;
  }

  public keyChange() {
    // TODO Implement conflict status 409 and provide the URL of conflict account in the Location header field
  }

  public async getDirectory(request: Request) {
    return this.wrapAction(async (response) => {
      const data = await this.directoryService.getDirectory();
      response.content = new Content(data);
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
  public async createAccount(request: Request) {
    return this.wrapAction(async (response) => {
      const header = request.body!.getProtected();
      const params = request.body!.getPayload<AccountCreateParams>();
      let account = await this.accountService.findByPublicKey(header.jwk!);

      if (params.onlyReturnExisting) {
        if (!account) {
          throw new AccountDoesNotExistError();
        }
        response.content = new Content(this.convertService.toAccount(account));
        response.status = HttpStatusCode.ok;
      }
      else {
        if (!account) {
          // Create new account
          account = await this.accountService.create(header.jwk!, params);
          response.content = new Content(this.convertService.toAccount(account));
          response.status = 201; // Created
        }
        else {
          // Existing account
          response.content = new Content(this.convertService.toAccount(account));
          response.status = 200; // Ok
        }
      }

      response.headers.location = `{Options.BaseAddress}/acct/{account.Id}`;
    }, request, true);
  }
  //#endregion
}