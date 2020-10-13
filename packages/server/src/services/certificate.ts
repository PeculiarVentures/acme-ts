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

  /**
   * CA certificates cache
   */
  public caCerts: Map<string, x509.X509Certificate> = new Map();

  protected certificateRepository = container.resolve<ICertificateRepository>(diCertificateRepository);

  /**
   * Creates and adds certificate to repository
   * @param rawData
   * @param order
   */
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

    // Check chaining certificate
    await this.getChain(certificate);

    const cert = await this.certificateRepository.add(certificate);

    this.logger.info(`Certificate ${cert.thumbprint} created`);
    return cert;
  }

  /**
   * Revokes certificate by order
   * @param order
   * @param reason
   */
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

  /**
   * Returns CA certificates
   */
  public async getCaCerts() {
    if (!this.caCerts.size) {
      await this.reloadCaCache();
    }
    if (!this.caCerts.size) {
      throw new MalformedError("CA certificates not found");
    }
    return this.caCerts;
  }

  /**
   * Returns certificate by thumbprint from ca cache and repository
   * @param thumbprint
   */
  public async getByThumbprint(thumbprint: string): Promise<ICertificate> {
    // return ca certificate from cache
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

    // return certificate from repository
    const cert = await this.certificateRepository.findByThumbprint(thumbprint);
    if (!cert) {
      throw new MalformedError("Certificate doesn't exist");
    }
    return cert;
  }

  /**
   * Enrols certificate by order and params
   * @param order
   * @param params
   */
  public async enroll(order: IOrder, params: FinalizeParams): Promise<ICertificate> {
    const requestRaw = pvtsutils.Convert.FromBase64Url(params.csr);

    const type = params.endpoint || this.options.defaultEndpoint;
    const service = this.getEndpoint(type);
    const cert = await service.enroll(order, requestRaw);
    order.endpoint = type;
    return await this.create(cert, order);
  }

  /**
   * Returns certificates chain for certificate by thumbprint
   * from ca certificate cache and repository
   * @param thumbprint
   */
  public async getChain(thumbprint: string | ICertificate) {
    let cert: ICertificate;
    if (typeof thumbprint === "string") {
      cert = await this.getByThumbprint(thumbprint);
    } else {
      cert = thumbprint;
    }
    const x509Cert = new x509.X509Certificate(cert.rawData);

    await this.getCaCerts();
    const chainBuilder = new x509.X509ChainBuilder({
      certificates: Array.from(this.caCerts.values()),
    });
    let chain: x509.X509Certificates;
    try {
      chain = await chainBuilder.build(x509Cert);
    } catch (error) {
      await this.reloadCaCache();
      chain = await chainBuilder.build(x509Cert);
    }
    return chain;
  }

  /**
   * Downloads and adds CA certificates to cache
   * from repository, endpoints and options
   */
  protected async reloadCaCache() {
    // add ca to cache from repository
    const caCerts = await this.certificateRepository.findCaCertificates() || [];
    for (const caCert of caCerts) {
      this.caCerts.set(caCert.thumbprint, new x509.X509Certificate(caCert.rawData));
    }

    // add ca to cache from endpoints
    const endpoints = container.resolveAll<IEndpointService>(diEndpointService);
    await Promise.all(endpoints.map(async o => {
      const endpointCerts = await o.getCaCertificate();
      await Promise.all(endpointCerts.map(async cert => {
        const thumbprint = pvtsutils.Convert.ToHex(await cert.getThumbprint());
        if (!this.caCerts.has(thumbprint)) {
          await this.create(cert.rawData);
          this.caCerts.set(thumbprint, cert);
        }
      }));
    }));

    // add ca to cache from options
    if (this.options.extraCertificateStorage) {
      const chain = new x509.X509ChainBuilder({ certificates: this.options.extraCertificateStorage }).certificates;
      await Promise.all(chain.map(async cert => {
        const thumbprint = pvtsutils.Convert.ToHex(await cert.getThumbprint());
        if (!this.caCerts.has(thumbprint)) {
          this.caCerts.set(thumbprint, cert);
        }
      }));
    }
  }

  /**
   * Returns all registered endpoints
   */
  protected getEndpointAll(): IEndpointService[] {
    return container.resolveAll<IEndpointService>(diEndpointService);
  }

  /**
   * Returns Endpoint by type
   * @param type Endpoint type
   */
  public getEndpoint(type?: string): IEndpointService {
    const endpoints = this.getEndpointAll();
    if (!endpoints.length) {
      throw new MalformedError("Endpoints not found");
    }

    if (type) {
      const endpoint = endpoints.filter(o => o.type === type);
      if (!endpoint.length) {
        throw new MalformedError(`Unsupported endpoint type '${type}'`);
      }
      if (endpoint.length > 1) {
        throw new MalformedError(`Several endpoints have been registered with the same type '${type}'`);
      }
      return endpoint[0];
    } else {
      return endpoints[0];
    }
  }
}
