import { DependencyContainer } from "tsyringe";
import * as data from "@peculiar/acme-data";
import * as repositories from "./repositories";


export class DependencyInjection {
  public static register(container: DependencyContainer) {
    data.DependencyInjection.register(container);
    container.register(data.diAccountRepository, repositories.AccountRepository);
    container.register(data.diAuthorizationRepository, repositories.AuthorizationRepository);
    container.register(data.diChallengeRepository, repositories.ChallengeRepository);
    container.register(data.diExternalAccountRepository, repositories.ExternalAccountRepository);
    container.register(data.diNonceRepository, repositories.NonceRepository);
    container.register(data.diOrderRepository, repositories.OrderRepository);
    container.register(data.diOrderAuthorizationRepository, repositories.OrderAuthorizationRepository);
  }
}