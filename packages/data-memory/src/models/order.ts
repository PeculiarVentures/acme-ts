import { IOrder, IError, ICertificate } from "@peculiar/acme-data";
import { OrderStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";

export class Order extends BaseObject implements IOrder {
  public status: OrderStatus = "pending";
  public identifier = "";
  public expires?: Date;
  public notBefore = new Date();
  public notAfter = new Date();
  public error?: IError;
  public certificate?: ICertificate;
  public accountId?: string | number;

  public constructor(params: Partial<Order> = {}) {
    super(params);
  }

}
