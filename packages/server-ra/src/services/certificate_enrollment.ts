import { BaseService, ICertificateEnrollmentService } from "@peculiar/acme-server";
import { IOrder } from "@peculiar/acme-data";
import { FinalizeParams, RevokeReason } from "@peculiar/acme-protocol";
import { MalformedError } from "@peculiar/acme-core";
import { container, injectable } from "tsyringe";
import * as pvtsutils from "pvtsutils";

export const diEndpointService = "Ra.Endpoint";

export interface IEndpointService {
  readonly type: string;
  enroll(order: IOrder, request: ArrayBuffer): Promise<ArrayBuffer>;
  revoke(order: IOrder, reason: RevokeReason): Promise<void>;
}

@injectable()
export class CertificateEnrollmentService extends BaseService implements ICertificateEnrollmentService {

  public async enroll(order: IOrder, params: FinalizeParams): Promise<ArrayBuffer> {
    const requestRaw = pvtsutils.Convert.FromBase64Url(params.csr);

    const type = params.endpoint || this.options.defaultEndpoint;
    const service = await this.getEndpoint(type);
    const cert = await service.enroll(order, requestRaw);
    order.endpoint = type;
    return cert;
  }

  public async revoke(order: IOrder, reason: RevokeReason): Promise<void> {
    const service = await this.getEndpoint(order.endpoint || this.options.defaultEndpoint);
    await service.revoke(order, reason);
  }

  protected getEndpointAll(): IEndpointService[] {
    return container.resolveAll<IEndpointService>(diEndpointService);
  }

  protected getEndpoint(type: string): IEndpointService {
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