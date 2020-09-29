import { diExternalAccountService, ExternalAccountService } from "@peculiar/acme-server";
import { Controllers } from "@peculiar/acme-express";
import { container, injectable } from "tsyringe";
import { Request, Response } from "express";
import { Content } from "@peculiar/acme-core";
import { Auth0Service, diAuth0 } from "../services";

@injectable()
export class RaControllers extends Controllers {

  protected auth0 = container.resolve<Auth0Service>(diAuth0);

  protected externalAccountService = container.resolve<ExternalAccountService>(diExternalAccountService);

  public async newExternalAccount(req: Request, res: Response): Promise<void> {
    const request = this.getAcmeRequest(req);
    const result = await this.acmeController.wrapAction(async (res) => {
      if (!req.headers.authorization) {
        throw new Error("Authorization header is required");
      }

      const profile = await this.auth0.getProfile(req.headers.authorization);
      if (profile.email && profile.phone_number) {
        if (!profile.email_verified && !profile.phone_verified) {
          throw new Error("Email and phone number don't verified");
        }
      } else if (profile.email) {
        if (!profile.email_verified) {
          throw new Error("Email don't verified");
        }
      } else {
        if (!profile.phone_verified) {
          throw new Error("Phone number don't verified");
        }
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