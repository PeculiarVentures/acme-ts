import { Request, Response, Express } from 'express';
import { diLogger, ConsoleLogger } from "@peculiar/acme-core";
import { cryptoProvider } from "@peculiar/x509";
import { AcmeExpress, diControllers } from "@peculiar/acme-express";
import * as acmeServer from "@peculiar/acme-server";
import { Crypto } from "@peculiar/webcrypto";
import { container } from "tsyringe";

import * as services from "./services";
import { RaControllers } from "./controllers";

export * from "./controllers";
export * from "./services";

export class AcmeRa {

  public static register(app: Express, options: Partial<acmeServer.IServerOptions>) {

    const crypto = new Crypto();
    cryptoProvider.set(crypto);

    // before AcmeExpress because this logger need for logs in setup moment
    container.register(diLogger, ConsoleLogger);

    AcmeExpress.register(app, options);

    if (!options.baseAddress) {
      throw new Error("Base Address is required");
    }
    const url = new URL(options.baseAddress);

    app.get(`${url.pathname}/new-eab`, (req: Request, res: Response) => {
      container.resolve<RaControllers>(diControllers).newExternalAccount(req, res);
    });

    app.get(`/`, (req: Request, res: Response) => {
      container.resolve<RaControllers>(diControllers).getHealthy(req, res);
    });

    container.register(acmeServer.diIdentifierService, services.EmailChallengeService);
    container.register(acmeServer.diDirectoryService, services.RaDirectoryService);
    container.register(acmeServer.diConvertService, services.RaConvertService);
    container.register(diControllers, RaControllers);
    container.register(acmeServer.diExternalAccountService, acmeServer.ExternalAccountService);
    container.register(acmeServer.diAuthorizationService, services.RaAuthorizationService);
    container.register(services.diAuthProviderService, services.ProviderService);
  }
}
