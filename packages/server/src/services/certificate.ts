import { AlreadyRevokedError, MalformedError } from "@peculiar/acme-core";
import { diCertificateRepository, ICertificate, ICertificateRepository, IOrder } from "@peculiar/acme-data";
import { container, injectable } from "tsyringe";
import { BaseService } from "./base";
import { diCertificateEnrollmentService, ICertificateEnrollmentService, ICertificateService } from "./types";
import * as ModelFabric from "./model_fabric";
import * as pvtsutils from "pvtsutils";
import { RevokeReason } from "@peculiar/acme-protocol";

@injectable()
export class CertificateService extends BaseService implements ICertificateService {

  protected certificateRepository = container.resolve<ICertificateRepository>(diCertificateRepository);
  protected certificateEnrollmentService = container.resolve<ICertificateEnrollmentService>(diCertificateEnrollmentService);

  public async create(rawData: ArrayBuffer, order?: IOrder,): Promise<ICertificate> {
    const certificate = ModelFabric.certificate();
    certificate.rawData = rawData;
    certificate.thumbprint = pvtsutils.Convert.ToHex(await this.getHash(rawData));
    certificate.status = "valid";
    if (order) {
      certificate.orderId = order.id;
    }
    const cert = await this.certificateRepository.add(certificate);

    this.logger.info(`Certificate ${cert.thumbprint} created`);

    return cert;
  }

  public async revoke(order: IOrder, reason: RevokeReason): Promise<void> {
    if (!order.certificate) {
      throw new MalformedError("Order doesn't have a certificate");
    }
    const cert = await this.getByThumbprint(order.certificate);

    if (cert.status === "revoked") {
      throw new AlreadyRevokedError();
    }

    // revoke
    await this.certificateEnrollmentService.revoke(order, reason);

    // update status
    cert.status = "revoked";
    await this.certificateRepository.update(cert);

    this.logger.info(`Certificate ${order.certificate} revoked`);
  }

  public async getByThumbprint(thumbprint: string): Promise<ICertificate> {
    const cert = await this.certificateRepository.findByThumbprint(thumbprint);
    if (!cert) {
      throw new MalformedError("Certificate doesn't exist");
    }
    return cert;
  }

  /**
   * Returns hash
   * @param obj
   */
  protected async getHash(obj: ArrayBuffer, alg: string = this.options.hashAlgorithm) {
    return this.getCrypto().subtle.digest(alg, obj);
  }
}