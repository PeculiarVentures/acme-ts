import { DependencyContainer, Lifecycle } from "tsyringe";
import * as data from "@peculiar/acme-data";
import * as repositories from "./repositories";
import * as models from "./models";
import * as dynamoose from "dynamoose";
import { AWSError, DynamoDB } from "aws-sdk";
import { diOptionsService, IOptions, OptionsService } from "./options";
import { SourceLogger } from "@peculiar/acme-core";

export interface IDynamoOptions {
  client: DynamoDB.ClientConfiguration;
  options: IOptions;
}

class DynamoDbSetup extends SourceLogger { }

function isAwsError(error: unknown): error is AWSError {
  return error instanceof Error && "code" in error;
}

export class DependencyInjection {

  public static async registerAsync(container: DependencyContainer, options: IDynamoOptions) {

    await this.validate(options);

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
  /**
   * Check connections with database
   */
  private static async validate(options: IDynamoOptions) {
    const aws = new DynamoDB(options.client);
    const tableName = options.options.tableName ?? repositories.BaseRepository.defaultTableName;
    const logger = new DynamoDbSetup();
    try {
      await aws.describeTable({ TableName: tableName }).promise();
    } catch (error) {
      if (isAwsError(error)) {
        switch (error.code) {
          case "ResourceNotFoundException":
            logger.warn(`Dynamo table '${tableName}' is not found. Table will be created by Mongoose module`, { aws: error.message });
            break;
          default:
            throw new Error(`Can not establish a connection to the database. ${error.message}`);
        }
      }
    }
    throw new Error(`Can not establish a connection to the database. Unknown error`);
  }
}
