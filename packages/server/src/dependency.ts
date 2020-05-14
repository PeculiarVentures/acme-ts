import { DependencyContainer } from "tsyringe";
import { diAccountService, diDirectoryService, diConvertService, diNonceService, diExternalAccountService } from "./services/types";
import { AccountService, DirectoryService, ConvertService, NonceService, ExternalAccountService } from "./services";
import { AcmeController, diAcmeController } from "./controllers";

export class DependencyInjection {
  public static register(container: DependencyContainer) {
    container.register(diConvertService, ConvertService);
    container.register(diDirectoryService, DirectoryService);
    container.register(diNonceService, NonceService);
    container.register(diAccountService, AccountService);
    container.register(diExternalAccountService, ExternalAccountService);
    container.register(diAcmeController, AcmeController);
  }
}