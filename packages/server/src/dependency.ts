import { DependencyContainer } from "tsyringe";
import { diAccountService, diDirectoryService, diConvertService, diNonceService, diExternalAccountService } from "./services/types";
import { AccountService, DirectoryService, ConvertService, NonceService, ExternalAccountService, IServerOptions, diServerOptions } from "./services";
import { AcmeController, diAcmeController } from "./controllers";

export class DependencyInjection {
  public static register(container: DependencyContainer, options: IServerOptions) {
    container
      .registerInstance(diServerOptions, options)
      .register(diConvertService, ConvertService)
      .register(diDirectoryService, DirectoryService)
      .register(diNonceService, NonceService)
      .register(diAccountService, AccountService)
      .register(diExternalAccountService, ExternalAccountService)
      .register(diAcmeController, AcmeController);
  }
}