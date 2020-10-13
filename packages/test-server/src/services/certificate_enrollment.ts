/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseService, ICertificateService, IEndpointService } from "@peculiar/acme-server";
import { diCertificate, ICertificate, IOrder } from "@peculiar/acme-data";
import { FinalizeParams, RevokeReason } from "@peculiar/acme-protocol";
import * as x509 from "@peculiar/x509";
import * as pvtsutils from "pvtsutils";
import { Convert } from "pvtsutils";
import { container, injectable } from "tsyringe";

@injectable()
export class CertificateEnrollmentService extends BaseService implements ICertificateService {
  public getByThumbprint(thumbprint: string): Promise<ICertificate> {
    throw new Error("Method not implemented.");
  }
  public create(rawData: ArrayBuffer, order?: IOrder): Promise<ICertificate> {
    throw new Error("Method not implemented.");
  }
  public getChain(thumbprint: string | ICertificate): Promise<x509.X509Certificates> {
    throw new Error("Method not implemented.");
  }
  public getEndpoint(type: string): IEndpointService {
    throw new Error("Method not implemented.");
  }

  public static signingAlgorithm: RsaHashedKeyGenParams = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };

  public async enroll(order: IOrder, request: FinalizeParams) {
    const req = new x509.Pkcs10CertificateRequest(request.csr);
    const ca: x509.X509Certificate = (this.options as any).caCertificate;
    if (!ca) {
      throw new Error("Cannot get CA certificate");
    }

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
      signingAlgorithm: CertificateEnrollmentService.signingAlgorithm,
      publicKey: await req.publicKey.export(this.getCrypto()),
      signingKey: ca.privateKey!,
    }, this.getCrypto());

    const certificate = container.resolve<ICertificate>(diCertificate);
    certificate.rawData = cert.rawData;
    certificate.thumbprint = pvtsutils.Convert.ToHex(await this.getHash(cert.rawData));
    certificate.status = "valid";
    certificate.type = "leaf";
    certificate.orderId = order.id;
    return certificate;
  }

  public async revoke(order: IOrder, reason: RevokeReason): Promise<void> {
    // nothing
  }

}
