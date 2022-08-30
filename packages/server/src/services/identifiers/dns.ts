import * as core from "@peculiar/acme-core";
import * as data from "@peculiar/acme-data";
import * as pvtsutils from "pvtsutils";
import * as types from "../types";
import { container, injectable } from "tsyringe";
import { BaseService } from "../base";
import { JsonWebKey } from "@peculiar/jose";
import { id_ce_subjectAltName, SubjectAlternativeName } from "@peculiar/asn1-x509";
import { AsnConvert } from "@peculiar/asn1-schema";
import * as x509 from "@peculiar/x509";
import { MalformedError } from "@peculiar/acme-core";

@injectable()
export class DnsChallengeService extends BaseService implements types.IIdentifierService {
  public type = "dns";

  protected challengeRepository = container.resolve<data.IChallengeRepository>(data.diChallengeRepository);
  protected authorizationRepository = container.resolve<data.IAuthorizationRepository>(data.diAuthorizationRepository);
  protected accountService = container.resolve<types.IAccountService>(types.diAccountService);

  public async csrValidate(identifiers: data.IIdentifier[], csr: x509.Pkcs10CertificateRequest): Promise<core.AcmeError[]> {
    const identifiersCsr = this.getDomainNames(csr);
    const problems: core.AcmeError[] = [];

    identifiers.forEach(i => {
      if (!identifiersCsr.find(o => i.value.toLowerCase() === o.toLowerCase())) {
        problems.push(new core.MalformedError(`DNS name '${i.value}' from order not found in CSR`));
      }
    });

    identifiersCsr.forEach(i => {
      if (!identifiers.find(o => o.value.toLowerCase() === i.toLowerCase())) {
        problems.push(new core.MalformedError(`DNS name '${i}' from CSR not found in order`));
      }
    });

    return problems;
  }

  private getDomainNames(csr: x509.Pkcs10CertificateRequest) {
    const names: string[] = [];

    const name = new x509.Name(csr.subject);
    name.toJSON().forEach(o => {
      const dns = o["DC"];
      if (dns && dns.length) {
        for (const o2 of dns) {
          names.push(o2);
        }
      }
    });

    const ext = csr.getExtension(id_ce_subjectAltName);
    if (ext) {
      const san = AsnConvert.parse(ext.value, SubjectAlternativeName);
      san.forEach(o => {
        if (o.dNSName) {
          names.push(o.dNSName);
        }
      });
    }

    return names;
  }

  public async identifierValidate(identifier: data.IIdentifier): Promise<core.AcmeError[]> {
    const pattern = /^(?:[-A-Za-zА-Яа-я0-9]+\.)+[A-Za-zА-Яа-я]{2,6}$/g;
    const problems: core.AcmeError[] = [];
    if (!pattern.test(identifier.value)) {
      problems.push(new core.MalformedError(`Identifier '${identifier.value}' is not domain name`));
    }
    return problems;
  }

  public async challengesCreate(auth: data.IAuthorization): Promise<data.IChallenge[]> {
    const challenges: data.IChallenge[] = [];
    // Add challenges
    challenges.push(await this._create(auth.id, "http-01"));
    //const tls = ChallengeService.Create(addedAuth.Id, "tls-01");
    //const dns = ChallengeService.Create(addedAuth.Id, "dns-01");
    return challenges;
  }

  public async challengeValidate(challenge: data.IChallenge): Promise<void> {
    const oldStatus = challenge.status;

    if (challenge.status === "pending") {
      challenge.status = "processing";
      await this.challengeRepository.update(challenge);
      this.logger.debug("Challenge status updated", {
        id: challenge.id,
        newStatus: challenge.status,
        oldStatus: oldStatus,
      });

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
          } catch (e) {
            const error: Error = !(e instanceof Error)
              ? new Error(`Unknown error '${e}'`)
              : e;

            const err = container.resolve<data.IError>(data.diError);
            if (error instanceof core.AcmeError) {
              err.detail = error.message;
              err.type = error.type as core.ErrorType;
            } else if (error instanceof Error) {
              err.detail = error.message;
              err.type = core.ErrorType.serverInternal;
            }
            challenge.error = err;
            challenge.status = "invalid";

            this.logger.error(err.detail,
              {
                challenge: {
                  id: challenge.id,
                  type: challenge.type,
                },
                stack: error.stack || null,
                error,
              });

            await this.challengeRepository.update(challenge);
          }
          break;
        default:
          throw new MalformedError(`Unsupported Challenge type '${challenge.type}'`);
      }

      this.logger.debug("Challenge status updated", {
        id: challenge.id,
        newStatus: challenge.status,
        oldStatus: oldStatus,
      });
    } else {
      throw new core.MalformedError(`Challenge '${challenge.id}' has wrong status '${challenge.status}'`);
    }
  }

  /**
   * Validates the http challenge
   * @param challenge Challenge
   */
  private async validateHttpChallenge(challenge: data.IChallenge): Promise<void> {
    const auth = await this.authorizationRepository.findById(challenge.authorizationId);
    if (!auth) {
      throw new core.MalformedError(`Cannot get Authorization by Id '${challenge.authorizationId}'`);
    }
    const url = `$http:;//${auth.identifier.value}/.well-known/acme-challenge/${challenge.token}`;

    if (!this.options.debugMode) {
      const response = await fetch(url);
      if (response.status === 200) {

        const text = await response.text();

        //Accounts.GetById(challenge.Authorization.AccountId
        const account = await this.accountService.getById(auth.accountId);
        const thumbprint = await new JsonWebKey(this.getCrypto(), account.key).getThumbprint();
        const controlValue = `${challenge.token}.${thumbprint}`;

        if (controlValue !== text) {
          const errMessage = "The key authorization file from the server did not match this challenge.";
          throw new core.UnauthorizedError(errMessage);
        }
      }
      else {
        throw new MalformedError("Response status is not 200(OK)");
      }
    } else {
      this.logger.warn("HTTP challenge validation is disabled for DEBUG mode");
    }
  }

  private async _create(authId: data.Key, type: string): Promise<data.IChallenge> {
    const challenge = container.resolve<data.IChallenge>(data.diChallenge);
    await this.onCreateParams(challenge, authId, type);

    await this.challengeRepository.add(challenge);

    this.logger.debug(`Challenge created`, {
      id: challenge.id,
      type: challenge.type,
    });

    return challenge;
  }

  /**
   * Fills parameters
   * @param challenge
   * @param authId
   * @param type
   */
  protected async onCreateParams(challenge: data.IChallenge, authId: data.Key, type: string) {
    challenge.type = type;
    challenge.authorizationId = authId;
    challenge.status = "pending";
    const httpToken = new Uint8Array(20);
    this.getCrypto().getRandomValues(httpToken);
    challenge.token = pvtsutils.Convert.ToBase64Url(httpToken);
  }

}
