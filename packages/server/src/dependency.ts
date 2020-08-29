import { Empty } from "@peculiar/acme-data";
import { Crypto } from "@peculiar/webcrypto";
import { cryptoProvider } from "@peculiar/acme-core";
import { DependencyContainer } from "tsyringe";
import { AcmeController, diAcmeController } from "./controllers";
import * as types from "./services/types";
import * as services from "./services";

export class DependencyInjection {
  public static register(container: DependencyContainer, options: services.IServerOptions) {
    options.cryptoProvider ??= new Crypto();
    cryptoProvider.set(options.cryptoProvider);

    container
      .registerInstance(services.diServerOptions, options)
      .register(types.diConvertService, services.ConvertService)
      .register(types.diDirectoryService, services.DirectoryService)
      .register(types.diNonceService, services.NonceService)
      .register(types.diAccountService, services.AccountService)
      .register(types.diExternalAccountService, services.ExternalAccountService)
      .register(types.diAuthorizationService, services.AuthorizationService)
      .register(types.diChallengeService, services.ChallengeService)
      .register(types.diOrderService, services.OrderService)
      .register(types.diCertificateEnrollmentService, Empty)
      .register(diAcmeController, AcmeController);
  }
}