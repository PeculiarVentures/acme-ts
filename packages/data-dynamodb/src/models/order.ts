import { IOrder, IError, ICertificate, Key, CertificateStatus } from "@peculiar/acme-data";
import { OrderStatus } from "@peculiar/acme-protocol";
import { BaseObject, IBaseDynamoObject } from "./base";
import { Convert } from "pvtsutils";
import { CRLReason } from "@peculiar/asn1-x509";

export interface IOrderDynamo extends IBaseDynamoObject {
  status: OrderStatus;
  identifier: string;
  expires?: string;
  notBefore?: string;
  notAfter?: string;
  error?: IError;
  certificate?: ICertificateDynamo;
}

export interface ICertificateDynamo {
  id: Key;
  reason?: CRLReason;
  status: CertificateStatus;
  thumbprint: string;
  rawData: string;
}

export class Order extends BaseObject implements IOrder {
  public status: OrderStatus;
  public identifier: string;
  public expires?: Date;
  public notBefore?: Date;
  public notAfter?: Date;
  public error?: IError;
  public certificate?: ICertificate;
  public accountId?: Key;

  public constructor(params: Partial<Order> = {}) {
    super(params);

    this.status ??= "pending";
    this.identifier ??= "";
  }

  //accountId#hashIdentifier#data
  public async toDynamo() {
    const dynamo: IOrderDynamo = {
      id: this.id,
      index: `order#${this.identifier}#${new Date().valueOf()}`,
      parentId: this.accountId!.toString(),
      status: this.status,
      identifier: this.identifier,
    };
    if (this.expires) {
      dynamo.expires = this.fromDate(this.expires);
    }
    if (this.notBefore) {
      dynamo.notBefore = this.fromDate(this.notBefore);
    }
    if (this.notAfter) {
      dynamo.notAfter = this.fromDate(this.notAfter);
    }
    if (this.error) {
      dynamo.error = this.error;
    }
    if (this.certificate) {
      const cert: ICertificateDynamo = {
        id: this.certificate.id,
        status: this.certificate.status,
        thumbprint: this.certificate.thumbprint,
        rawData: Convert.ToBase64(this.certificate.rawData),
      };
      if (this.certificate.reason) {
        cert.reason = this.certificate.reason;
      }
      dynamo.certificate = cert;
    }
    return dynamo;
  }

  public fromDynamo(data: IOrderDynamo) {
    this.status = data.status;
    this.identifier = data.identifier;
    if (data.expires) {
      this.expires = this.toDate(data.expires);
    }
    if (data.notBefore) {
      this.notBefore = this.toDate(data.notBefore);
    }
    if (data.notAfter) {
      this.notAfter = this.toDate(data.notAfter);
    }
    if (data.error) {
      this.error = data.error;
    }
    if (data.certificate) {
      const cert: ICertificate = {
        id: data.certificate.id,
        rawData: Convert.FromBase64(data.certificate.rawData),
        status: data.certificate.status,
        thumbprint: data.certificate.thumbprint,
        reason: data.certificate.reason,
      };
      this.certificate = cert;
    }
    if (data.parentId) {
      this.accountId = data.parentId;
    }

  }
}
