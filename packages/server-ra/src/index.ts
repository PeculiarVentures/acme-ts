import { Request, Response, Express } from 'express';
import { diLogger, ConsoleLogger } from "@peculiar/acme-core";
import { cryptoProvider } from "@peculiar/x509";
import { AcmeExpress, diControllers } from "@peculiar/acme-express";
import { DependencyInjection as diData } from "@peculiar/acme-data-memory";
import * as acmeServer from "@peculiar/acme-server";
import { Crypto } from "@peculiar/webcrypto";
import { container, Lifecycle } from "tsyringe";

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

    app.get('/acme/new-eab', (req: Request, res: Response) => {
      container.resolve<RaControllers>(diControllers).newExternalAccount(req, res);
    });

    container.register(acmeServer.diCertificateEnrollmentService, services.CertificateEnrollmentService, { lifecycle: Lifecycle.Singleton });
    container.register(acmeServer.diIdentifierService, services.EmailChallengeService);
    container.register(acmeServer.diDirectoryService, services.RaDirectoryService);
    container.register(services.diAuth0, services.Auth0Service);
    container.register(diControllers, RaControllers);
    container.register(acmeServer.diExternalAccountService, acmeServer.ExternalAccountService);
    container.register(acmeServer.diAuthorizationService, services.RaAuthorizationService);
    container.register(services.diAuth0, services.Auth0Service);
    diData.register(container);
  }
}