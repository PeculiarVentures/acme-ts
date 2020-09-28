import { BaseService, ICertificateEnrollmentService } from "@peculiar/acme-server";
import { IOrder } from "@peculiar/acme-data";
import { RevokeReason } from "@peculiar/acme-protocol";
import { X509Certificate, Pkcs10CertificateRequest } from "@peculiar/acme-core";
import { X509CertificateGenerator } from "packages/core/src/crypto/x509_cert_generator";
import { Convert } from "pvtsutils";
import { injectable } from "tsyringe";

@injectable()
export class CertificateEnrollmentService extends BaseService implements ICertificateEnrollmentService {

  public static signingAlgorithm: RsaHashedKeyGenParams = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };

  public async enroll(order: IOrder, request: ArrayBuffer): Promise<ArrayBuffer> {
    const req = new Pkcs10CertificateRequest(request);
    const ca: X509Certificate =  (this.options as any).caCertificate;
    if (!ca) {
      throw new Error("Cannot get CA certificate");
    }

    // validity
    const notBefore = new Date();
    const notAfter = new Date();
    notAfter.setUTCMonth(notAfter.getUTCMonth() + 1);

    const cert = await X509CertificateGenerator.create({
      serialNumber: Convert.ToHex(this.getCrypto().getRandomValues(new Uint8Array(10))),
      subject: req.subject,
      issuer: ca.subject,
      notBefore,
      notAfter,
      signingAlgorithm: CertificateEnrollmentService.signingAlgorithm,
      publicKey: await req.publicKey.export(this.getCrypto()),
      signingKey: ca.privateKey!,
    }, this.getCrypto());
    return cert.rawData;
  }

  public async revoke(order: IOrder, reason: RevokeReason): Promise<void> {
    // nothing
  }

}