import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { diAcmeController, AcmeController } from "@peculiar/acme-server";
import { Request as AcmeRequest, Response as AcmeResponse, ContentType, MalformedError } from "@peculiar/acme-core";
import { ParamsDictionary } from "express-serve-static-core";
import { Key } from "@peculiar/acme-data";

export const diControllers = "ACME.Express.Controllers";

@injectable()
export class Controllers {
  public constructor(
    @inject(diAcmeController) protected acmeController: AcmeController,
  ) { }

  public async getDirectory(req: Request<ParamsDictionary>, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.getDirectory(request);
    this.createHttpResponseMessage(result, res);
  }
  public async getNonce(req: Request<ParamsDictionary>, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.getNonce(request);
    this.createHttpResponseMessage(result, res);
  }

  //#region Account
  public async newAccount(req: Request<ParamsDictionary>, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.newAccount(request);
    this.createHttpResponseMessage(result, res);
  }
  public async postAccount(req: Request<ParamsDictionary>, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postAccount(request);
    this.createHttpResponseMessage(result, res);
  }
  public async keyChange(req: Request<ParamsDictionary>, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.keyChange(request);
    this.createHttpResponseMessage(result, res);
  }
  //#endregion

  //#region Order
  public async createOrder(req: Request<ParamsDictionary>, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.createOrder(request);
    this.createHttpResponseMessage(result, res);
  }
  public async postOrder(req: Request<ParamsDictionary>, res: Response, orderId: Key): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postOrder(request, orderId);
    this.createHttpResponseMessage(result, res);
  }
  public async postOrders(req: Request<ParamsDictionary>, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postOrders(request);
    this.createHttpResponseMessage(result, res);
  }
  public async finalizeOrder(req: Request<ParamsDictionary>, res: Response, orderId: Key): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.finalizeOrder(request, orderId);
    this.createHttpResponseMessage(result, res);
  }
  //#endregion

  public async postChallenge(req: Request<ParamsDictionary>, res: Response, challengeId: Key): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postChallenge(request, challengeId);
    this.createHttpResponseMessage(result, res);
  }

  public async postAuthorization(req: Request<ParamsDictionary>, res: Response, authId: Key): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postAuthorization(request, authId);
    this.createHttpResponseMessage(result, res);
  }

  //#region Certificate
  public async getCertificate(req: Request<ParamsDictionary>, res: Response, thumbprint: string): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.getCertificate(request, thumbprint);
    this.createHttpResponseMessage(result, res);
  }
  public async revokeCertificate(req: Request<ParamsDictionary>, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.revokeCertificate(request);
    this.createHttpResponseMessage(result, res);
  }
  //#endregion

  //#region Parse Request and Response
  protected createHttpResponseMessage(response: AcmeResponse, res: Response): Response {
    const link = response.headers.link;
    const location = response.headers.location;
    const replayNonce = response.headers.replayNonce;

    if (link) {
      res.setHeader("Link", link);
    }
    if (location) {
      res.setHeader("Location", location);
    }
    if (replayNonce) {
      res.setHeader("Replay-Nonce", replayNonce);
    }

    if (response.content) {
      switch (response.content.type) {
        case ContentType.joseJson:
        case ContentType.json:
        case ContentType.pemCertificateChain:
        case ContentType.pkcs7Mime:
        case ContentType.pkixCert:
        case ContentType.problemJson:
          res.contentType(response.content.type)
            .status(response.status)
            .send(response.content);
          break;
        default:
          res.contentType(ContentType.json)
            .status(response.status)
            .send(JSON.stringify(response.content));
          break;
      }
    } else {
      res.status(response.status).send();
    }
    return res;
  }

  protected getAcmeRequest(req: Request<import("express-serve-static-core").ParamsDictionary>): AcmeRequest {
    const result = new AcmeRequest();

    // parse method
    switch (req.method.toUpperCase()) {
      case "GET":
        result.method = "GET";
        break;
      case "POST":
        result.method = "POST";
        break;
      case "HEAD":
        result.method = "HEAD";
        break;

      default:
        throw new MalformedError();
    }

    // parse query
    const keys = Object.keys(req.query);
    keys.forEach(key => {
      const value = req.query[key] as string | string[] | undefined;
      const params: string[] = result.queryParams[key] = [];
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(o => params.push(o));
        } else {
          params.push(value);

        }
      }
    });

    result.path = req.path;
    result.body = req.body;

    // parse header
    const headerKeys = Object.keys(req.header);
    headerKeys.forEach(key => {
      const value = req.header(key);
      result.header[key] = value;
    });

    return result;
  }
  //#endregion
}