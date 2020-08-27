import { DependencyContainer } from "tsyringe";
import * as types from "./services/types";
import * as services from "./services";
import { AcmeController, diAcmeController } from "./controllers";
import { Empty } from "@peculiar/acme-data";

export class DependencyInjection {
  public static register(container: DependencyContainer, options: services.IServerOptions) {
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