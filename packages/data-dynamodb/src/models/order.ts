import { IOrder, IError, Key } from "@peculiar/acme-data";
import { OrderStatus } from "@peculiar/acme-protocol";
import { BaseObject, IBaseDynamoObject } from "./base";

export interface IOrderDynamo extends IBaseDynamoObject {
  status: OrderStatus;
  identifier: string;
  expires?: string;
  notBefore?: string;
  notAfter?: string;
  error?: IError;
  certificate?: string;
  authorizations?: string[];
}

export class Order extends BaseObject implements IOrder {
  public status: OrderStatus;
  public identifier: string;
  public expires?: Date;
  public notBefore?: Date;
  public notAfter?: Date;
  public error?: IError;
  public certificate?: string;
  public accountId?: Key;
  public authorizations?: Key[];

  public constructor(params: Partial<Order> = {}) {
    super(params);

    this.status ??= "pending";
    this.identifier ??= "";
  }

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
      dynamo.certificate = this.certificate;
    }
    if (this.authorizations) {
      dynamo.authorizations = this.authorizations.map((a) => a.toString());
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
      this.certificate = data.certificate;
    }
    if (data.parentId) {
      this.accountId = data.parentId;
    }
    if (data.authorizations) {
      this.authorizations = data.authorizations.map((a) => a.toString());
    }
  }
}
