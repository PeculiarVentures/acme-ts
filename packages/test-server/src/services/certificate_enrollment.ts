import { BaseService, ICertificateEnrollmentService } from "@peculiar/acme-server";
import { IOrder } from "@peculiar/acme-data";
import { RevokeReason } from "@peculiar/acme-protocol";
import { X509Certificate, Pkcs10CertificateRequest } from "@peculiar/acme-core";
import { X509CertificateGenerator } from "packages/core/src/crypto/x509_cert_generator";
import { Convert } from "pvtsutils";

export class CertificateEnrollmentService extends BaseService implements ICertificateEnrollmentService {

  public static signingAlgorithm: RsaHashedKeyGenParams = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };
  public caCert?: X509Certificate;

  public async getCaCert() {
    if (!this.caCert) {
      // Create new CA cert
      const notBefore = new Date();
      const notAfter = new Date();
      notAfter.setUTCFullYear(notAfter.getUTCFullYear() + 1);
      const name = "CN=ACME demo CA, O=PeculiarVentures LLC";
      const keys = await this.options.cryptoProvider.subtle.generateKey(CertificateEnrollmentService.signingAlgorithm, false, ["sign", "verify"]) as CryptoKeyPair;

      this.caCert = await X509CertificateGenerator.create({
        serialNumber: "01",
        subject: name,
        issuer: name,
        notBefore,
        notAfter,
        signingAlgorithm: CertificateEnrollmentService.signingAlgorithm,
        publicKey: keys.publicKey,
        signingKey: keys.privateKey,
      }, this.options.cryptoProvider);
      this.caCert.privateKey = keys.privateKey;
    }
    return this.caCert;
  }

  public async enroll(order: IOrder, request: ArrayBuffer): Promise<ArrayBuffer> {
    const req = new Pkcs10CertificateRequest(request);
    const ca =  await this.getCaCert();

    // validity
    const notBefore = new Date();
    const notAfter = new Date();
    notAfter.setUTCMonth(notAfter.getUTCMonth() + 1);

    const cert = await X509CertificateGenerator.create({
      serialNumber: Convert.ToHex(this.options.cryptoProvider.getRandomValues(new Uint8Array(10))),
      subject: req.subject,
      issuer: ca.issuer,
      notBefore,
      notAfter,
      signingAlgorithm: CertificateEnrollmentService.signingAlgorithm,
      publicKey: await req.getPublicKey(),
      signingKey: ca.privateKey!,
    }, this.options.cryptoProvider);
    return cert.rawData;
  }

  public async revoke(order: IOrder, reason: RevokeReason): Promise<void> {
    // nothing
  }

}