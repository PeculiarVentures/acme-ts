import { IOrder } from "@peculiar/acme-data";
import { RevokeReason } from "@peculiar/acme-protocol";
import { BaseService, IEndpointService } from "@peculiar/acme-server";
import * as x509 from "@peculiar/x509";
import { Convert } from "pvtsutils";
import { injectable } from "tsyringe";

@injectable()
export class MemoryEndpointService extends BaseService implements IEndpointService {

  private caCert?: x509.X509Certificate;
  public type = "memory";

  public async createCA() {
    const keys = await this.getCrypto().subtle.generateKey(this.signingAlgorithm, false, ["sign", "verify"]) as CryptoKeyPair;
    const basicConstraints = new x509.BasicConstraintsExtension(true, undefined, true);

    const ca = await x509.X509CertificateGenerator.createSelfSigned({
      name: "CN=Test Root CA",
      keys,
      notBefore: new Date(),
      notAfter: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours of validity
      signingAlgorithm: this.signingAlgorithm,
      serialNumber: "01",
      extensions: [basicConstraints],
    }, this.getCrypto());
    ca.privateKey = keys.privateKey;
    return ca;
  }

  private signingAlgorithm: RsaHashedKeyGenParams = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };

  private async getCaCert() {
    if (!this.caCert) {
      this.caCert = await this.createCA();
      this.options.extraCertificateStorage ??= [];
      this.options.extraCertificateStorage.push(this.caCert);
    }

    return this.caCert;
  }

  public async getCaCertificate(): Promise<x509.X509Certificates> {
    return new x509.X509Certificates(await this.getCaCert());
  }

  public async enroll(order: IOrder, request: ArrayBuffer): Promise<ArrayBuffer> {
    const req = new x509.Pkcs10CertificateRequest(request);
    const ca = await this.getCaCert();

    // validity
    const notBefore = new Date();
    const notAfter = new Date();
    notAfter.setUTCMonth(notAfter.getUTCMonth() + 1);

    const cert = await x509.X509CertificateGenerator.create({
      serialNumber: Convert.ToHex(this.getCrypto().getRandomValues(new Uint8Array(10))),
      subject: req.subject,
      issuer: ca.subject,
      notBefore,
      notAfter,
      signingAlgorithm: this.signingAlgorithm,
      publicKey: await req.publicKey.export(this.getCrypto()),
      signingKey: ca.privateKey!,
    }, this.getCrypto());
    return cert.rawData;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async revoke(order: IOrder, reason: RevokeReason): Promise<void> {
    // nothing
  }

}
