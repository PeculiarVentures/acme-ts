import { diExternalAccountService, ExternalAccountService } from "@peculiar/acme-server";
import { Controllers } from "@peculiar/acme-express";
import { container, injectable } from "tsyringe";
import { Request, Response } from "express";
import { Content } from "@peculiar/acme-core";
import { diAuthProviderService, ProviderService } from "../services";

@injectable()
export class RaControllers extends Controllers {

  protected providerService = container.resolve<ProviderService>(diAuthProviderService);
  protected externalAccountService = container.resolve<ExternalAccountService>(diExternalAccountService);

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
      res.content = new Content(
        {
          challenge: externalAccount.key,
          kid: `${this.acmeController.options.baseAddress}/kid/${externalAccount.id}`
        },
        this.acmeController.options.formattedResponse);
      res.status = 201; // Created
    }, request);
    this.createHttpResponseMessage(result, res);
  }


}