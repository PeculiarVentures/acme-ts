import { injectable, inject } from "tsyringe";
import { BaseService, IServerOptions, diServerOptions } from "./base";
import { IChallengeService, diAccountService, IAccountService } from "./types";
import * as data from "@peculiar/acme-data";
import * as ModelFabric from "./model_fabric";
import { MalformedError, UnauthorizedError, ErrorType } from "@peculiar/acme-core";
import * as pvtsutils from "pvtsutils";
import { JsonWebKey } from "@peculiar/jose";

@injectable()
export class ChallengeService extends BaseService implements IChallengeService {
  public constructor(
    @inject(data.diChallengeRepository) protected challengeRepository: data.IChallengeRepository,
    @inject(data.diAuthorizationRepository) protected authorizationRepository: data.IAuthorizationRepository,
    @inject(diAccountService) protected accountService: IAccountService,
    @inject(diServerOptions) options: IServerOptions) {
    super(options);
  }

  public async getById(id: data.Key): Promise<data.IChallenge> {
    const challenge = await this.challengeRepository.findById(id);
    if (!challenge) {
      throw new MalformedError("Challenge does not exist");
    }
    return challenge;
  }

  public async validate(challenge: data.IChallenge): Promise<void> {
    if (challenge.status === "pending") {
      challenge.status = "processing";
      await this.challengeRepository.update(challenge);

      // Logger.Info("Challenge {id} status updated to {status}", challenge.Id, challenge.Status);

      // validate challenge
      switch (challenge.type) {
        case "http-01":
          try {
            await this.validateHttpChallenge(challenge);
            if (challenge.status === "processing") {
              challenge.status = "valid";
              challenge.validated = new Date();
              await this.challengeRepository.update(challenge);
            }
          } catch (error) {
            challenge.error = ModelFabric.error();
            challenge.error.detail = error.message;
            challenge.error.type = ErrorType.serverInternal;
            challenge.status = "invalid";
            await this.challengeRepository.update(challenge);
          }
          break;
        default:
          throw new Error(`Unsupported Challenge type '${challenge.type}'`);
      }

      // Logger.Info("Challenge {id} status updated to {status}", challenge.Id, challenge.Status);
    } else {
      throw new MalformedError("Wrong challenge status");
    }
  }

  public async create(authId: data.Key, type: string): Promise<data.IChallenge> {
    const challenge = ModelFabric.challenge();
    this.onCreateParams(challenge, authId, type);

    await this.challengeRepository.add(challenge);

    // Logger.Info("Challenge {id} created", challenge.Id);

    return challenge;
  }

  /**
   * Fills parameters
   * @param challenge
   * @param authId
   * @param type
   */
  protected onCreateParams(challenge: data.IChallenge, authId: data.Key, type: string) {
    challenge.type = type;
    challenge.authorizationId = authId;
    challenge.status = "pending";
    const httpToken = new Uint8Array(20);
    this.options.cryptoProvider.getRandomValues(httpToken);
    challenge.token = pvtsutils.Convert.ToBase64Url(httpToken);
  }

  public async getByAuthorization(id: data.Key): Promise<data.IChallenge[]> {
    const challenge = await this.challengeRepository.findByAuthorization(id);
    if (!challenge) {
      throw new MalformedError("Challenge does not exist");
    }
    return challenge;
  }

  /**
   * Validates the http challenge
   * @param challenge Challenge
   */
  private async validateHttpChallenge(challenge: data.IChallenge): Promise<void> {
    const auth = await this.authorizationRepository.findById(challenge.authorizationId);
    if (!auth) {
      throw new MalformedError("Cannot get Authorization by Id");
    }
    const url = `$http://${auth.identifier.value}/.well-known/acme-challenge/${challenge.token}`;

    if (!this.options.debugMode) {
      const response = await fetch(url);
      if (response.status === 200) {

        const text = await response.text();

        //Accounts.GetById(challenge.Authorization.AccountId
        const account = await this.accountService.getById(auth.accountId);
        const thumbprint = await new JsonWebKey(this.options.cryptoProvider, account.key).getThumbprint();
        const controlValue = `${challenge.token}.${thumbprint}`;

        if (controlValue !== text) {
          const errMessage = "The key authorization file from the server did not match this challenge.";
          throw new UnauthorizedError(errMessage);
        }
      }
      else {
        throw new Error("Response status is not 200(OK)");
      }
    }
    // Logger.Warn("HTTP challenge validation is disabled fo DEBUG mode");
  }


}