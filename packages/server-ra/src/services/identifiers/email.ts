import * as core from "@peculiar/acme-core";
import * as data from "@peculiar/acme-data";
import * as server from "@peculiar/acme-server";
import * as x509 from "@peculiar/x509";
import * as pvtsutils from "pvtsutils";
import { container, injectable } from "tsyringe";
import { id_ce_subjectAltName, SubjectAlternativeName } from "@peculiar/asn1-x509";
import { AsnConvert } from "@peculiar/asn1-schema";

@injectable()
export class EmailChallengeService extends server.BaseService implements server.IIdentifierService {
  public type = "email";

  protected challengeRepository = container.resolve<data.IChallengeRepository>(data.diChallengeRepository);

  public async csrValidate(identifiers: data.IIdentifier[], csr: x509.Pkcs10CertificateRequest): Promise<core.AcmeError[]> {
    const identifiersCsr = this.getEmails(csr);
    const problems: core.AcmeError[] = [];

    identifiers.forEach(i => {
      if (!identifiersCsr.find(o => i.value.toLowerCase() === o.toLowerCase())) {
        problems.push(new core.MalformedError(`Email name '${i.value}' from order not found in CSR`));
      }
    });

    identifiersCsr.forEach(i => {
      if (!identifiers.find(o => o.value.toLowerCase() === i.toLowerCase())) {
        problems.push(new core.MalformedError(`Email name '${i}' from CSR not found in order`));
      }
    });

    return problems;
  }

  private getEmails(csr: x509.Pkcs10CertificateRequest) {
    const names: string[] = [];

    const name = new x509.Name(csr.subject);
    name.toJSON().forEach(o => {
      const dns = o["E"];
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
        if (o.rfc822Name) {
          names.push(o.rfc822Name);
        }
      });
    }

    return names;
  }

  public async identifierValidate(identifier: data.IIdentifier): Promise<core.AcmeError[]> {
    // eslint-disable-next-line no-control-regex
    const pattern = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/g;

    const problems: core.AcmeError[] = [];
    if (!pattern.test(identifier.value)) {
      problems.push(new core.MalformedError(`Identifier '${identifier.value}' is not email`));
    }
    return problems;
  }

  public async challengesCreate(auth: data.IAuthorization): Promise<data.IChallenge[]> {
    const challenges: data.IChallenge[] = [];
    challenges.push(await this.create(auth.id, "pv-email-01"));
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