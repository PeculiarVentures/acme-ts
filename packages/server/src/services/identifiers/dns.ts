import * as core from "@peculiar/acme-core";
import * as data from "@peculiar/acme-data";
import * as ModelFabric from "../model_fabric";
import * as pvtsutils from "pvtsutils";
import * as types from "../types";
import { inject, injectable } from "tsyringe";
import { BaseService, diServerOptions, IServerOptions } from "../base";
import { JsonWebKey } from "@peculiar/jose";
import { IChallenge } from "@peculiar/acme-data";
import { AcmeError, MalformedError, Name } from "@peculiar/acme-core";
import { id_ce_subjectAltName, SubjectAlternativeName } from "@peculiar/asn1-x509";
import { AsnConvert } from "@peculiar/asn1-schema";

@injectable()
export class DnsChallengeService extends BaseService implements types.IIdentifierService {
  public type = "dns";

  public constructor(
    @inject(data.diChallengeRepository) protected challengeRepository: data.IChallengeRepository,
    @inject(data.diAuthorizationRepository) protected authorizationRepository: data.IAuthorizationRepository,
    @inject(types.diAccountService) protected accountService: types.IAccountService,
    @inject(core.diLogger) logger: core.ILogger,
    @inject(diServerOptions) options: IServerOptions) {
    super(options, logger);
  }
  public async csrValidate(identifiers: data.IIdentifier[], csr: core.Pkcs10CertificateRequest): Promise<AcmeError[]> {
    const identifiersCsr = this.getDomainNames(csr);
    const problems: AcmeError[] = [];

    identifiers.forEach(i => {
      if (!identifiersCsr.find(o => i.value.toLowerCase() === o.toLowerCase())) {
        problems.push(new MalformedError(`DNS name '${i.value}' from order not found in CSR`));
      }
    });

    identifiersCsr.forEach(i => {
      if (!identifiers.find(o => o.value.toLowerCase() === i.toLowerCase())) {
        problems.push(new MalformedError(`DNS name '${i}' from CSR not found in order`));
      }
    });

    return problems;
  }

  private getDomainNames(csr: core.Pkcs10CertificateRequest) {
    const names: string[] = [];

    const name = new Name(csr.subject);
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

  public async identifierValidate(identifier: data.IIdentifier): Promise<AcmeError[]> {
    const pattern = /^(?:[-A-Za-zА-Яа-я0-9]+\.)+[A-Za-zА-Яа-я]{2,6}$/g;
    const problems: AcmeError[] = [];
    if (!pattern.test(identifier.value)) {
      problems.push(new MalformedError(`Identifier '${identifier.value}' is not domain name`));
    }
    return problems;
  }

  public async challengesCreate(auth: data.IAuthorization): Promise<IChallenge[]> {
    const challenges: IChallenge[] = [];
    // Add challenges
    challenges.push(await this._create(auth.id, "http-01"));
    //const tls = ChallengeService.Create(addedAuth.Id, "tls-01");
    //const dns = ChallengeService.Create(addedAuth.Id, "dns-01");
    return challenges;
  }

  public async challengeValidate(challenge: IChallenge): Promise<void> {
    if (challenge.status === "pending") {
      challenge.status = "processing";
      await this.challengeRepository.update(challenge);

      this.logger.info(`Challenge ${challenge.id} status updated to ${challenge.status}`);

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
            challenge.error.type = core.ErrorType.serverInternal;
            challenge.status = "invalid";
            await this.challengeRepository.update(challenge);
          }
          break;
        default:
          throw new Error(`Unsupported Challenge type '${challenge.type}'`);
      }

      this.logger.info(`Challenge ${challenge.id} status updated to ${challenge.status}`);
    } else {
      throw new core.MalformedError("Wrong challenge status");
    }
  }

  /**
   * Validates the http challenge
   * @param challenge Challenge
   */
  private async validateHttpChallenge(challenge: data.IChallenge): Promise<void> {
    const auth = await this.authorizationRepository.findById(challenge.authorizationId);
    if (!auth) {
      throw new core.MalformedError("Cannot get Authorization by Id");
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
        throw new Error("Response status is not 200(OK)");
      }
    }
    this.logger.warn("HTTP challenge validation is disabled fo DEBUG mode");
  }

  private async _create(authId: data.Key, type: string): Promise<data.IChallenge> {
    const challenge = ModelFabric.challenge();
    this.onCreateParams(challenge, authId, type);

    await this.challengeRepository.add(challenge);

    this.logger.info(`Challenge ${challenge.id} created`);

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
    this.getCrypto().getRandomValues(httpToken);
    challenge.token = pvtsutils.Convert.ToBase64Url(httpToken);
  }

}