import { Content } from "@peculiar/acme-core";
import { Controllers } from "@peculiar/acme-express";
import * as server from "@peculiar/acme-server";
import { cryptoProvider } from "@peculiar/x509";
import { Request, Response } from "express";
import { Convert } from "pvtsutils";
import { container, injectable } from "tsyringe";

import { diAuthProviderService, ProviderService } from "../services";
import { RaConvertService } from "../services/convert";

@injectable()
export class RaControllers extends Controllers {

  protected providerService = container.resolve<ProviderService>(diAuthProviderService);
  protected externalAccountService = container.resolve<server.ExternalAccountService>(server.diExternalAccountService);
  protected raConverterService = container.resolve<RaConvertService>(server.diConvertService);

  private aliveAt = new Date().toISOString();
  private instance = Convert.ToBase64Url(cryptoProvider.get().getRandomValues(new Uint8Array(10)));

  public options: server.IServerOptions = container.resolve<server.IServerOptions>(server.diServerOptions);

  public async getHealthy(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.wrapAction(async (res) => {
      res.content = new Content(
        {
          alive: true,
          aliveAt: this.aliveAt,
          timestamp: new Date().toISOString(),
          instance: this.instance,
          v: this.options.version || "0.0.0",
        },
        this.acmeController.options.formattedResponse);
      res.status = 200;
    }, request);
    this.createHttpResponseMessage(result, res);
  }

  public async newExternalAccount(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.wrapAction(async (res) => {
      if (!req.headers.authorization) {
        throw new Error("Authorization header is required");
      }
      const profile = await this.providerService.getProfile(req.headers.authorization, req.query.provider?.valueOf().toString());
      if (!profile.email && !profile.phone) {
        throw new Error("Email and phone number don't verified");
      }

      const externalAccount = await this.externalAccountService.create(profile);
      res.content = new Content(this.raConverterService.toEabChallenge(externalAccount),
        this.acmeController.options.formattedResponse);
      res.status = 201; // Created
    }, request);
    this.createHttpResponseMessage(result, res);
  }


}
