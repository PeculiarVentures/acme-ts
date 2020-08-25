import { DependencyContainer, Lifecycle } from "tsyringe";
import * as data from "@peculiar/acme-data";
import * as repositories from "./repositories";
import * as models from "./models";


export class DependencyInjection {
  public static register(container: DependencyContainer) {
    data.DependencyInjection.register(container);
    container.register(data.diAccount, models.Account)
      .register(data.diAuthorization, models.Authorization)
      .register(data.diCertificate, models.Certificate)
      .register(data.diChallenge, models.Challenge)
      .register(data.diError, models.Error)
      .register(data.diExternalAccount, models.ExternalAccount)
      .register(data.diOrderAuthorization, models.OrderAuthorization)
      .register(data.diOrder, models.Order)

    container.register(data.diAccountRepository, repositories.AccountRepository, {lifecycle: Lifecycle.Singleton});
    container.register(data.diAuthorizationRepository, repositories.AuthorizationRepository, {lifecycle: Lifecycle.Singleton});
    container.register(data.diChallengeRepository, repositories.ChallengeRepository, {lifecycle: Lifecycle.Singleton});
    container.register(data.diExternalAccountRepository, repositories.ExternalAccountRepository, {lifecycle: Lifecycle.Singleton});
    container.register(data.diNonceRepository, repositories.NonceRepository, {lifecycle: Lifecycle.Singleton});
    container.register(data.diOrderRepository, repositories.OrderRepository, {lifecycle: Lifecycle.Singleton});
    container.register(data.diOrderAuthorizationRepository, repositories.OrderAuthorizationRepository, {lifecycle: Lifecycle.Singleton});
  }
}