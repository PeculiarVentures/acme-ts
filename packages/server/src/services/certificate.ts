import { AlreadyRevokedError, MalformedError } from "@peculiar/acme-core";
import { diCertificateRepository, ICertificate, ICertificateRepository, IOrder } from "@peculiar/acme-data";
import { container, injectable } from "tsyringe";
import { BaseService } from "./base";
import { diEndpointService, ICertificateService, IEndpointService } from "./types";
import * as ModelFabric from "./model_fabric";
import * as pvtsutils from "pvtsutils";
import * as x509 from "@peculiar/x509";
import { FinalizeParams, RevokeReason } from "@peculiar/acme-protocol";

@injectable()
export class CertificateService extends BaseService implements ICertificateService {

  public x509caCerts: Map<string, x509.X509Certificate> = new Map();

  protected certificateRepository = container.resolve<ICertificateRepository>(diCertificateRepository);

  public async create(rawData: ArrayBuffer, order?: IOrder,): Promise<ICertificate> {
    const certificate = ModelFabric.certificate();
    certificate.rawData = rawData;
    certificate.thumbprint = pvtsutils.Convert.ToHex(await this.getHash(rawData));
    certificate.status = "valid";
    if (order) {
      certificate.type = "leaf";
      certificate.orderId = order.id;
    } else {
      certificate.type = "ca";
    }

    await this.getChain(certificate);

    const cert = await this.certificateRepository.add(certificate);

    this.logger.info(`Certificate ${cert.thumbprint} created`);

    return cert;
  }

  public async revoke(order: IOrder, reason: RevokeReason): Promise<void> {
    if (!order.certificate) {
      throw new MalformedError("Order doesn't have a certificate");
    }
    const cert = await this.getByThumbprint(order.certificate);
    if (cert.type === "ca") {
      throw new MalformedError("Certificate cannot be revoked. This is a CA certificate");
    }
    if (cert.status === "revoked") {
      throw new AlreadyRevokedError();
    }

    // revoke
    const service = this.getEndpoint(order.endpoint || this.options.defaultEndpoint);
    await service.revoke(order, reason);

    // update status
    cert.status = "revoked";
    await this.certificateRepository.update(cert);

    this.logger.info(`Certificate ${order.certificate} revoked`);
  }

  public async getCaCerts() {
    if (!this.x509caCerts.size) {
      await this.reloadCaCache();
    }
    if (!this.x509caCerts.size) {
      throw new MalformedError("CA certificates not found");
    }
    return this.x509caCerts;
  }

  public async getByThumbprint(thumbprint: string): Promise<ICertificate> {
    const caCerts = await this.getCaCerts();
    const caCert = caCerts.get(thumbprint);
    if (caCert) {
      return {
        id: thumbprint,
        rawData: caCert.rawData,
        status: "valid",
        thumbprint,
        type: "ca",
      };
    }
    const cert = await this.certificateRepository.findByThumbprint(thumbprint);
    if (!cert) {
      throw new MalformedError("Certificate doesn't exist");
    }
    return cert;
  }

  public async enroll(order: IOrder, params: FinalizeParams): Promise<ICertificate> {
    const requestRaw = pvtsutils.Convert.FromBase64Url(params.csr);

    const type = params.endpoint || this.options.defaultEndpoint;
    const service = this.getEndpoint(type);
    const cert = await service.enroll(order, requestRaw);
    order.endpoint = type;
    return await this.create(cert, order);
  }

  public async getChain(thumbprint: string | ICertificate) {
    let cert: ICertificate;
    if (typeof thumbprint === "string") {
      cert = await this.getByThumbprint(thumbprint);
    } else {
      cert = thumbprint;
    }
    const x509Cert = new x509.X509Certificate(cert.rawData);
    // if (cert.type === "ca" && x509Cert.isSelfSigned()) {
    //   return x509Cert;
    // }
    await this.getCaCerts();
    const chainBuilder = new x509.X509ChainBuilder({
      certificates: Array.from(this.x509caCerts.values()),
    });
    let chain: x509.X509Certificates;
    try {
      chain = await chainBuilder.build(x509Cert);
    } catch (error) {
      await this.reloadCaCache();
      chain = await chainBuilder.build(x509Cert);
    }
    return chain;
    // return await Promise.all(chain.map(async o => {
    //   const x509thumbprint = pvtsutils.Convert.ToHex(await o.getThumbprint());
    //   const ca = this.caCerts.find(ca => ca.thumbprint === x509thumbprint);
    //   if (!ca) {
    //     throw new MalformedError("Not found CA from cache");
    //   }
    //   return ca;
    // }));
  }

  protected async reloadCaCache() {
    // add ca from repository
    const caCerts = await this.certificateRepository.findCaCertificates() || [];
    for (const caCert of caCerts) {
      this.x509caCerts.set(caCert.thumbprint, new x509.X509Certificate(caCert.rawData));
    }

    // add ca from endpoints
    const endpoints = container.resolveAll<IEndpointService>(diEndpointService);
    await Promise.all(endpoints.map(async o => {
      const endpointCerts = await o.getCaCertificate();
      await Promise.all(endpointCerts.map(async cert => {
        const thumbprint = pvtsutils.Convert.ToHex(await cert.getThumbprint());
        if (!this.x509caCerts.has(thumbprint)) {
          await this.create(cert.rawData);
          this.x509caCerts.set(thumbprint, cert);
        }
      }));
    }));

    // add ca from options
    if (this.options.extraCertificateStorage) {
      const chain = new x509.X509ChainBuilder({ certificates: this.options.extraCertificateStorage }).certificates;
      await Promise.all(chain.map(async cert => {
        const thumbprint = pvtsutils.Convert.ToHex(await cert.getThumbprint());
        if (!this.x509caCerts.has(thumbprint)) {
          this.x509caCerts.set(thumbprint, cert);
        }
      }));
    }
  }

  protected getEndpointAll(): IEndpointService[] {
    return container.resolveAll<IEndpointService>(diEndpointService);
  }

  public getEndpoint(type: string): IEndpointService {
    const validators = this.getEndpointAll();
    const validator = validators.filter(o => o.type === type);
    if (!validator.length) {
      throw new MalformedError(`Unsupported endpoint type '${type}'`);
    }
    if (validator.length > 1) {
      throw new MalformedError(`Several endpoints have been registered with the same type '${type}'`);
    }
    return validator[0];
  }
}