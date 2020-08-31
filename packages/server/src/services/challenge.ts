import { injectable, inject, container } from "tsyringe";
import { BaseService, IServerOptions, diServerOptions } from "./base";
import { diIdentifierService, IChallengeService, IIdentifierService } from "./types";
import * as data from "@peculiar/acme-data";
import { MalformedError, diLogger, ILogger, UnsupportedIdentifierError } from "@peculiar/acme-core";
import { IAuthorization, IIdentifier } from "@peculiar/acme-data";

@injectable()
export class ChallengeService extends BaseService implements IChallengeService {
  public constructor(
    @inject(data.diChallengeRepository) protected challengeRepository: data.IChallengeRepository,
    @inject(diLogger) logger: ILogger,
    @inject(diServerOptions) options: IServerOptions) {
    super(options, logger);
  }
  public async create(auth: IAuthorization, type: string): Promise<data.IChallenge[]> {
    const service = await this.getValidator(type);
    return await service._challengesCreate(auth);
  }

  public async getById(id: data.Key): Promise<data.IChallenge> {
    const challenge = await this.challengeRepository.findById(id);
    if (!challenge) {
      throw new MalformedError("Challenge does not exist");
    }
    return challenge;
  }

  public async identifierValidate(identifier: data.IIdentifier): Promise<void> {
    const service = await this.getValidator(identifier.type);
    await service._identifierValidate(identifier);
  }

  public async challengeValidate(challenge: data.IChallenge, type: string): Promise<void> {
    const service = await this.getValidator(type);
    await service._challengeValidate(challenge);
  }

  public async getByAuthorization(id: data.Key): Promise<data.IChallenge[]> {
    const challenge = await this.challengeRepository.findByAuthorization(id);
    if (!challenge) {
      throw new MalformedError("Challenge does not exist");
    }
    return challenge;
  }

  protected async getValidator(identifier: IIdentifier | string): Promise<IIdentifierService> {
    const validators = container.resolveAll<IIdentifierService>(diIdentifierService);
    let type: string;
    if (typeof (identifier) === "string") {
      type = identifier;
    } else {
      type = identifier.type;
    }
    const validator = validators.find(o => o.type === type);
    if (!validator) {
      throw new UnsupportedIdentifierError();
    }
    return validator;
  }
}