import { injectable, inject, container } from "tsyringe";
import { BaseService, IServerOptions, diServerOptions } from "./base";
import { diIdentifierService, IChallengeService, IIdentifierService } from "./types";
import * as data from "@peculiar/acme-data";
import * as core from "@peculiar/acme-core";
import { IAuthorization, IIdentifier } from "@peculiar/acme-data";
import * as pvtsutils from "pvtsutils";

@injectable()
export class ChallengeService extends BaseService implements IChallengeService {
  public constructor(
    @inject(data.diChallengeRepository) protected challengeRepository: data.IChallengeRepository,
    @inject(core.diLogger) logger: core.ILogger,
    @inject(diServerOptions) options: IServerOptions) {
    super(options, logger);
  }
  public async create(auth: IAuthorization, type: string): Promise<data.IChallenge[]> {
    const services = await this.getValidator(type);
    let challenges: data.IChallenge[] = [];
    for (const service of services) {
      challenges = [...challenges, ...await service.challengesCreate(auth)]
    }
    return challenges;
  }

  public async getById(id: data.Key): Promise<data.IChallenge> {
    const challenge = await this.challengeRepository.findById(id);
    if (!challenge) {
      throw new core.MalformedError("Challenge does not exist");
    }
    return challenge;
  }

  public async identifierValidate(identifier: data.IIdentifier | data.IIdentifier[]): Promise<void> {
    const err = new core.MalformedError("Validate identifier failed");
    const identifiers = Array.isArray(identifier) ? identifier : [identifier];
    for (const o of identifiers) {
      const services = await this.getValidator(o.type);
      let problems: core.AcmeError[] = [];
      for (const i of services) {
        const errors = await i.identifierValidate(o);
        if (errors.length) {
          problems = problems.concat(errors);
        }
      }
      if (problems.length) {
        err.subproblems = [...err.subproblems || [], ...problems];
      }
    }

    if (err.subproblems?.length) {
      throw err;
    }
  }

  public async challengeValidate(challenge: data.IChallenge, type: string): Promise<void> {
    const services = await this.getValidator(type);
    await Promise.all(services.map(async o => await o.challengeValidate(challenge)));
  }

  public async csrValidate(identifiers: data.IIdentifier[], csrStr: string): Promise<void> {
    let csr: core.Pkcs10CertificateRequest;
    try {
      csr = new core.Pkcs10CertificateRequest(pvtsutils.Convert.FromBase64(csrStr));
    } catch (error) {
      throw new core.BadCSRError("Cannot create CSR");
    }
    const err = new core.BadCSRError("Validate CSR failed");
    const validators = this.getValidatorAll();
    await Promise.all(validators.map(async o => {
      const items = identifiers.filter(i => i.type === o.type);
      if (items.length) {
        const problems = await o.csrValidate(items, csr);
        if (problems.length) {
          err.subproblems = [...err.subproblems || [], ...problems];
        }
      }
    }));
    if (err.subproblems) {
      throw err;
    }
  }

  public async getByAuthorization(id: data.Key): Promise<data.IChallenge[]> {
    const challenge = await this.challengeRepository.findByAuthorization(id);
    if (!challenge) {
      throw new core.MalformedError("Challenge does not exist");
    }
    return challenge;
  }

  protected getValidatorAll(): IIdentifierService[] {
    return container.resolveAll<IIdentifierService>(diIdentifierService);
  }

  protected getValidator(identifier: IIdentifier | string): IIdentifierService[] {
    const validators = this.getValidatorAll();
    let type: string;
    if (typeof (identifier) === "string") {
      type = identifier;
    } else {
      type = identifier.type;
    }
    const validator = validators.filter(o => o.type === type);
    if (!validator.length) {
      throw new core.UnsupportedIdentifierError(`Unsupported identifier type '${type}'`);
    }
    return validator;
  }
}