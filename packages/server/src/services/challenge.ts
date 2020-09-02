import { injectable, inject, container } from "tsyringe";
import { BaseService, IServerOptions, diServerOptions } from "./base";
import { diIdentifierService, IChallengeService, IIdentifierService } from "./types";
import * as data from "@peculiar/acme-data";
import { MalformedError, diLogger, ILogger, UnsupportedIdentifierError, Pkcs10CertificateRequest, BadCSRError } from "@peculiar/acme-core";
import { IAuthorization, IIdentifier } from "@peculiar/acme-data";
import * as pvtsutils from "pvtsutils";

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
    return await service.challengesCreate(auth);
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
    await service.identifierValidate(identifier);
  }

  public async challengeValidate(challenge: data.IChallenge, type: string): Promise<void> {
    const service = await this.getValidator(type);
    await service.challengeValidate(challenge);
  }

  public async csrValidate(identifiers: data.IIdentifier[], csrStr: string): Promise<void> {
    let csr: Pkcs10CertificateRequest;
    try {
      csr = new Pkcs10CertificateRequest(pvtsutils.Convert.FromBase64(csrStr));
    } catch (error) {
      throw new BadCSRError();
    }

    const validators = this.getValidatorAll();
    await Promise.all(validators.map(async o => {
      const items = identifiers.filter(i => i.type === o.type);
      if (items) {
        await o.csrValidate(items, csr);
      }
    }));
  }

  public async getByAuthorization(id: data.Key): Promise<data.IChallenge[]> {
    const challenge = await this.challengeRepository.findByAuthorization(id);
    if (!challenge) {
      throw new MalformedError("Challenge does not exist");
    }
    return challenge;
  }

  protected getValidatorAll(): IIdentifierService[] {
    return container.resolveAll<IIdentifierService>(diIdentifierService);
  }

  protected getValidator(identifier: IIdentifier | string): IIdentifierService {
    const validators = this.getValidatorAll();
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