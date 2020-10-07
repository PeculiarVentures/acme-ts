import { ICertificate, CertificateStatus, Key } from "@peculiar/acme-data";
import { BaseObject, IBaseDynamoObject } from "./base";
import { CRLReason } from "@peculiar/asn1-x509";
import { Convert } from "pvtsutils";

export interface ICertificateDynamo extends IBaseDynamoObject {
  id: string;
  reason?: CRLReason;
  status: CertificateStatus;
  rawData: string;
}

export class Certificate extends BaseObject implements ICertificate {

  public thumbprint: string;
  public orderId?: string;
  public rawData: ArrayBuffer;
  public reason?: CRLReason | undefined;
  public status: CertificateStatus;

  public constructor(params: Partial<Certificate> = {}) {
    super(params);

    this.orderId ??= "";
    this.thumbprint ??= "";
    this.rawData ??= new ArrayBuffer(0);
    this.status ??= "valid";
  }

  public fromDynamo(data: ICertificateDynamo) {
    this.rawData = Convert.FromBase64(data.rawData);
    this.status = data.status;
    this.thumbprint = data.id;
    this.reason = data.reason;
    this.orderId = data.parentId;
  }

  public async toDynamo() {
    const cert: ICertificateDynamo = {
      id: this.thumbprint,
      index: `cert#`,
      parentId: this.orderId ?? "",
      status: this.status,
      rawData: Convert.ToBase64(this.rawData),
    };
    if (this.reason) {
      cert.reason = this.reason;
    }
    return cert;
  }

}

