import { DependencyContainer } from "tsyringe";
import * as models from "./models";
import * as repository from "./repositories";

export class Empty {

}

export class DependencyInjection {
  public static register(container: DependencyContainer) {
    container
      .register(models.diAccount, Empty)
      .register(models.diAuthorization, Empty)
      .register(models.diCertificate, Empty)
      .register(models.diChallenge, Empty)
      .register(models.diError, Empty)
      .register(models.diExternalAccount, Empty)
      .register(models.diOrderAuthorization, Empty)
      .register(models.diOrder, Empty)

      .register(repository.diAccountRepository, Empty)
      .register(repository.diAuthorizationRepository, Empty)
      .register(repository.diExternalAccountRepository, Empty)
      .register(repository.diNonceRepository, Empty)
      .register(repository.diOrderAuthorizationRepository, Empty)
      .register(repository.diOrderRepository, Empty)
      .register(repository.diChallengeRepository, Empty);

  }
}