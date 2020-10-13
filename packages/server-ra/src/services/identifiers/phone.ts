import * as core from "@peculiar/acme-core";
import * as x509 from "@peculiar/x509";
import * as data from "@peculiar/acme-data";
import * as server from "@peculiar/acme-server";
import * as pvtsutils from "pvtsutils";
import { container, injectable } from "tsyringe";
import { id_ce_subjectAltName, SubjectAlternativeName } from "@peculiar/asn1-x509";
import { AsnConvert } from "@peculiar/asn1-schema";

@injectable()
export class PhoneChallengeService extends server.BaseService implements server.IIdentifierService {
  public type = "phone";

  protected challengeRepository = container.resolve<data.IChallengeRepository>(data.diChallengeRepository);

  public async csrValidate(identifiers: data.IIdentifier[], csr: x509.Pkcs10CertificateRequest): Promise<core.AcmeError[]> {
    const identifiersCsr = this.getPhones(csr);
    const problems: core.AcmeError[] = [];

    identifiers.forEach(i => {
      if (!identifiersCsr.find(o => i.value.toLowerCase() === o.toLowerCase())) {
        problems.push(new core.MalformedError(`Phone number '${i.value}' from order not found in CSR`));
      }
    });

    identifiersCsr.forEach(i => {
      if (!identifiers.find(o => o.value.toLowerCase() === i.toLowerCase())) {
        problems.push(new core.MalformedError(`Phone number '${i}' from CSR not found in order`));
      }
    });

    return problems;
  }

  private getPhones(csr: x509.Pkcs10CertificateRequest) {
    const names: string[] = [];

    const name = new x509.Name(csr.subject);
    name.toJSON().forEach(o => {
      const tel = o["2.5.4.20"];
      if (tel && tel.length) {
        for (const o2 of tel) {
          names.push(o2);
        }
      }
    });

    const ext = csr.getExtension(id_ce_subjectAltName);
    if (ext) {
      const san = AsnConvert.parse(ext.value, SubjectAlternativeName);
      san.forEach(o => {
        if (o.uniformResourceIdentifier && /^tel:/.test(o.uniformResourceIdentifier)) {
          names.push(o.uniformResourceIdentifier);
        }
      });
    }

    return names;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async identifierValidate(identifier: data.IIdentifier): Promise<core.AcmeError[]> {
    const problems: core.AcmeError[] = [];
    return problems;
  }

  public async challengesCreate(auth: data.IAuthorization): Promise<data.IChallenge[]> {
    const challenges: data.IChallenge[] = [];
    challenges.push(await this.create(auth.id, "pv-phone-01"));
    return challenges;
  }

  public async challengeValidate(challenge: data.IChallenge): Promise<void> {
    if (challenge.status === "pending") {
      throw new core.MalformedError("Method not implemented");
    } else {
      throw new core.MalformedError("Wrong challenge status");
    }
  }

  private async create(authId: data.Key, type: string): Promise<data.IChallenge> {
    const challenge = container.resolve<data.IChallenge>(data.diChallenge);
    await this.onCreateParams(challenge, authId, type);

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
  protected async onCreateParams(challenge: data.IChallenge, authId: data.Key, type: string) {
    challenge.type = type;
    challenge.authorizationId = authId;
    challenge.status = "valid";
    const httpToken = new Uint8Array(20);
    this.getCrypto().getRandomValues(httpToken);
    challenge.token = pvtsutils.Convert.ToBase64Url(httpToken);
  }

}
