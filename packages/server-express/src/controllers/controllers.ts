import * as core from "@peculiar/acme-core";
import * as data from "@peculiar/acme-data";
import * as server from "@peculiar/acme-server";

import { Request, Response } from "express";
import { container, injectable } from "tsyringe";

export const diControllers = "ACME.Express.Controllers";

@injectable()
export class Controllers {

  protected acmeController = container.resolve<server.AcmeController>(server.diAcmeController);

  public async getDirectory(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.getDirectory(request);
    this.createHttpResponseMessage(result, res);
  }
  public async getNonce(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.getNonce(request);
    this.createHttpResponseMessage(result, res);
  }

  //#region Account
  public async newAccount(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.newAccount(request);
    this.createHttpResponseMessage(result, res);
  }
  public async postAccount(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postAccount(request);
    this.createHttpResponseMessage(result, res);
  }
  public async keyChange(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.keyChange(request);
    this.createHttpResponseMessage(result, res);
  }
  //#endregion

  //#region Order
  public async createOrder(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.createOrder(request);
    this.createHttpResponseMessage(result, res);
  }
  public async postOrder(req: Request, res: Response, orderId: data.Key): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postOrder(request, orderId);
    this.createHttpResponseMessage(result, res);
  }
  public async postOrders(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postOrders(request);
    this.createHttpResponseMessage(result, res);
  }
  public async finalizeOrder(req: Request, res: Response, orderId: data.Key): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.finalizeOrder(request, orderId);
    this.createHttpResponseMessage(result, res);
  }
  //#endregion

  public async postChallenge(req: Request, res: Response, challengeId: data.Key): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postChallenge(request, challengeId);
    this.createHttpResponseMessage(result, res);
  }

  public async postAuthorization(req: Request, res: Response, authId: data.Key): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.postAuthorization(request, authId);
    this.createHttpResponseMessage(result, res);
  }
  public async createAuthorization(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.createAuthorization(request);
    this.createHttpResponseMessage(result, res);
  }

  //#region Certificate
  public async getCertificate(req: Request, res: Response, thumbprint: string): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.getCertificate(request, thumbprint);
    this.createHttpResponseMessage(result, res);
  }
  public async revokeCertificate(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.revokeCertificate(request);
    this.createHttpResponseMessage(result, res);
  }
  //#endregion

  public async getEndpoint(req: Request, res: Response, type: string): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.getEndpoint(request, type);
    this.createHttpResponseMessage(result, res);
  }

  //#region Parse Request and Response
  /**
   * Parse AcmeResponse to express response
   * @param response Acme response
   * @param res Express response
   */
  protected createHttpResponseMessage(response: core.Response, res: Response): void {
    const link = response.headers.link;
    const location = response.headers.location;
    const replayNonce = response.headers.replayNonce;
    const cacheControl = response.headers.cacheControl;

    if (link) {
      res.setHeader("Link", link);
    }
    if (location) {
      res.setHeader("Location", location);
    }
    if (replayNonce) {
      res.setHeader("Replay-Nonce", replayNonce);
    }
    if (cacheControl) {
      res.setHeader("Cache-Control", cacheControl);
    }

    if (response.content) {
      switch (response.content.type) {
        case core.ContentType.joseJson:
        case core.ContentType.json:
        case core.ContentType.problemJson:
          res.contentType(response.content.type)
            .status(response.status)
            .send(response.content);
          break;
        case core.ContentType.pem:
        case core.ContentType.pkcs7:
        case core.ContentType.pkix:
          res.contentType(response.content.type)
            .status(response.status)
            .send(Buffer.from(response.content.content));
          break;
        default:
          res.contentType(core.ContentType.json)
            .status(response.status)
            .send(JSON.stringify(response.content));
          break;
      }
    } else {
      res.status(response.status).send();
    }
  }

  /**
   * Parse request to AcmeRequest
   * @param req express request
   */
  protected getAcmeRequest(req: Request): server.Request {
    const result = new server.Request();

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
        throw new core.MalformedError("Method is not supported");
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
