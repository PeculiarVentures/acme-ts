import { injectable, container } from "tsyringe";
import { BaseService } from "./base";
import { diIdentifierService, IChallengeService, IIdentifierService } from "./types";
import * as data from "@peculiar/acme-data";
import * as core from "@peculiar/acme-core";
import { IAuthorization, IIdentifier } from "@peculiar/acme-data";
import * as x509 from "@peculiar/x509";

@injectable()
export class ChallengeService extends BaseService implements IChallengeService {

  protected challengeRepository = container.resolve<data.IChallengeRepository>(data.diChallengeRepository);

  public async create(auth: IAuthorization, type: string): Promise<data.IChallenge[]> {
    const services = await this.getValidator(type);
    let challenges: data.IChallenge[] = [];
    for (const service of services) {
      challenges = [...challenges, ...await service.challengesCreate(auth)];
    }
    this.logger.info(`'${challenges.length}' challenges for authorization id:${auth.id} created`);
    return challenges;
  }

  public async getById(id: data.Key): Promise<data.IChallenge> {
    const challenge = await this.challengeRepository.findById(id);
    if (!challenge) {
      throw new core.MalformedError(`Challenge id:${id} does not exist`);
    }

    this.logger.debug("Get challenge by id", {
      challenge: {
        id: challenge.id,
        type: challenge.type,
        status: challenge.status,
      }
    });

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
    let csr: x509.Pkcs10CertificateRequest;
    try {
      csr = new x509.Pkcs10CertificateRequest(csrStr);
    } catch (error) {
      throw new core.BadCSRError("Cannot parse CSR");
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
    const challenges = await this.challengeRepository.findByAuthorization(id);
    if (!challenges) {
      throw new core.MalformedError(`Challenge id:${id} does not exist`);
    }

    this.logger.debug(`Get list of challenges for authorization`, {
      authorization: {
        id,
      },
      challenges: challenges.map(o => {
        return {
          id: o.id,
          type: o.type,
          status: o.status,
        };
      })
    });

    return challenges;
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

    this.logger.debug("Get validator", {
      type,
      validators: validator.map(o => {
        return {
          type: o.constructor.name,
        };
      }),
    })

    return validator;
  }
}
