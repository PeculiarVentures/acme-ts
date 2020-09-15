import { IOrder, IError, ICertificate, Key } from "@peculiar/acme-data";
import { OrderStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";

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
  public async toDynamo(): Promise<void> {
    this.index = `order#${this.identifier}#${new Date().valueOf()}`;
    this.parentId = this.accountId!.toString();
  }

  public fromDynamo(data: any): void {
    this.status = data.status;
    this.identifier = data.identifier;
    if (data.expires) {
      this.expires = data.expires;
    }
    if (data.notBefore) {
      this.notBefore = data.notBefore;
    }
    if (data.notAfter) {
      this.notAfter = data.notAfter;
    }
    if (data.error) {
      this.error = data.error;
    }
    if (data.certificate) {
      this.certificate = data.certificate;
    }
    if (data.accountId) {
      this.accountId = data.accountId;
    }

  }
}
