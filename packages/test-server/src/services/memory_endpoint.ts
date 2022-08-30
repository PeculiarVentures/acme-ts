import { IOrder } from "@peculiar/acme-data";
import { RevokeReason } from "@peculiar/acme-protocol";
import { BaseService, diCertificateService, ICertificateService, IEndpointService } from "@peculiar/acme-server";
import * as x509 from "@peculiar/x509";
import { Convert } from "pvtsutils";
import { container, injectable } from "tsyringe";

function randomSerial(size = 10, crypto = x509.cryptoProvider.get()) {
  const rnd = crypto.getRandomValues(new Uint8Array(size));

  return Convert.ToHex(rnd);
}

@injectable()
export class MemoryEndpointService extends BaseService implements IEndpointService {

  public static async create(names?: string[]): Promise<IEndpointService> {
    const srv = new MemoryEndpointService(names);
    await srv.getCaCert();

    return srv;
  }

  public constructor(
    public names: string[] = ["Test Root CA"],
  ) {
    super();
  }

  private caCert?: x509.X509Certificate;
  public type = "memory";

  public async createCA(names: string[]) {
    let issuer: x509.X509Certificate | null = null;
    let length = names.length;
    for (const name of names) {
      const keys = await this.getCrypto().subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
      const cert: x509.X509Certificate = await x509.X509CertificateGenerator.create({
        serialNumber: randomSerial(),
        subject: name,
        issuer: issuer !== null ? issuer.issuerName : name,
        notBefore: new Date(),
        notAfter: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours of validity
        extensions: [
          new x509.BasicConstraintsExtension(true, length--, true),
        ],
        signingAlgorithm: { name: "ECDSA", hash: "SHA-256" },
        publicKey: keys.publicKey,
        signingKey: (() => {
          if (issuer) {
            if (!issuer.privateKey) {
              throw new Error("CA certificate doesn't have a private key");
            }
            return issuer.privateKey;
          }

          return keys.privateKey;
        })(),
      }, this.getCrypto());
      cert.privateKey = keys.privateKey;

      const certSrv = container.resolve<ICertificateService>(diCertificateService);
      await certSrv.create(cert.rawData);

      issuer = cert;
    }

    if (!issuer) {
      throw new Error("Cannot create the CA certificate. Issuer value is empty");
    }

    return issuer;
  }

  private async getCaCert() {
    if (!this.caCert) {
      this.caCert = await this.createCA(this.names);
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
      serialNumber: randomSerial(),
      subject: req.subject,
      issuer: ca.subject,
      notBefore,
      notAfter,
      extensions: [
        new x509.BasicConstraintsExtension(false),
      ],
      signingAlgorithm: ca.signatureAlgorithm,
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
