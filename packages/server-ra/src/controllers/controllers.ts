import { diConvertService, diExternalAccountService, ExternalAccountService } from "@peculiar/acme-server";
import { Controllers } from "@peculiar/acme-express";
import { container, injectable } from "tsyringe";
import { Request, Response } from "express";
import { Content } from "@peculiar/acme-core";
import { diAuthProviderService, ProviderService } from "../services";
import { RaConvertService } from "../services/convert";
import { cryptoProvider } from "@peculiar/x509";
import { Convert } from "pvtsutils";
import { version } from '../../package.json';

@injectable()
export class RaControllers extends Controllers {

  protected providerService = container.resolve<ProviderService>(diAuthProviderService);
  protected externalAccountService = container.resolve<ExternalAccountService>(diExternalAccountService);
  protected raConverterService = container.resolve<RaConvertService>(diConvertService);

  private aliveAt = new Date().toISOString();
  private instance = Convert.ToBase64Url(cryptoProvider.get().getRandomValues(new Uint8Array(10)));

  public async getHealthy(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.wrapAction(async (res) => {
      res.content = new Content(
        {
          alive: true,
          aliveAt: this.aliveAt,
          timestamp: new Date().toISOString(),
          instance: this.instance,
          v: version
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
