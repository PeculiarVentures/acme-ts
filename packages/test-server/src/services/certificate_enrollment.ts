import { ICertificateEnrollmentService } from "@peculiar/acme-server";
import { IOrder } from "@peculiar/acme-data";
import { RevokeReason } from "@peculiar/acme-protocol";

export class CertificateEnrollmentService implements ICertificateEnrollmentService {
  public async enroll(order: IOrder, request: ArrayBuffer): Promise<ArrayBuffer> {
    throw new Error("Method not implemented.");
  }
  public async revoke(order: IOrder, reason: RevokeReason): Promise<void> {
    throw new Error("Method not implemented.");
  }

}