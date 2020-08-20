import { DependencyContainer } from "tsyringe";
import { DependencyInjection as DIData, diAccountRepository, diExternalAccountRepository, diNonceRepository } from "@peculiar/acme-data";
import { AccountRepository, ExternalAccountRepository, NonceRepository } from "./repositories";


export class DependencyInjection {
  public static register(container: DependencyContainer) {
    DIData.register(container);
    container.register(diNonceRepository, NonceRepository);
    container.register(diAccountRepository, AccountRepository);
    container.register(diExternalAccountRepository, ExternalAccountRepository);
  }
}