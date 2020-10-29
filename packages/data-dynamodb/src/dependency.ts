import { DependencyContainer, Lifecycle } from "tsyringe";
import * as data from "@peculiar/acme-data";
import * as repositories from "./repositories";
import * as models from "./models";
import * as dynamoose from "dynamoose";
import { DynamoDB } from "aws-sdk";
import { diOptionsService, IOptions, OptionsService } from "./options";

export interface IDynamoOptions {
  client: DynamoDB.ClientConfiguration;
  options: IOptions;
}

export class DependencyInjection {
  public static register(container: DependencyContainer, options: IDynamoOptions) {
    const ddb = new dynamoose.aws.sdk.DynamoDB(options.client);

    // Set DynamoDB instance to the Dynamoose DDB instance
    dynamoose.aws.ddb.set(ddb);

    data.DependencyInjection.register(container);

    // register options
    const optionsService = new OptionsService(options.options);
    container.register(diOptionsService, { useValue: optionsService });

    // register models
    container
      .register(data.diAccount, models.Account)
      .register(data.diAuthorization, models.Authorization)
      .register(data.diCertificate, models.Certificate)
      .register(data.diChallenge, models.Challenge)
      .register(data.diError, models.DynamoError)
      .register(data.diExternalAccount, models.ExternalAccount)
      .register(data.diOrderAuthorization, models.OrderAuthorization)
      .register(data.diOrder, models.Order);

    // register repositories
    container
      .register(data.diAccountRepository, repositories.AccountRepository, { lifecycle: Lifecycle.Singleton })
      .register(data.diAuthorizationRepository, repositories.AuthorizationRepository, { lifecycle: Lifecycle.Singleton })
      .register(data.diChallengeRepository, repositories.ChallengeRepository, { lifecycle: Lifecycle.Singleton })
      .register(data.diExternalAccountRepository, repositories.ExternalAccountRepository, { lifecycle: Lifecycle.Singleton })
      .register(data.diNonceRepository, repositories.NonceRepository, { lifecycle: Lifecycle.Singleton })
      .register(data.diOrderRepository, repositories.OrderRepository, { lifecycle: Lifecycle.Singleton })
      .register(data.diCertificateRepository, repositories.CertificateRepository, { lifecycle: Lifecycle.Singleton })
      .register(data.diOrderAuthorizationRepository, repositories.OrderAuthorizationRepository, { lifecycle: Lifecycle.Singleton });
  }
}
