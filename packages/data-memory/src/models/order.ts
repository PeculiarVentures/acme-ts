import { IOrder } from "@peculiar/acme-data";
import { OrderStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";

export class Order extends BaseObject implements IOrder {
  public status: OrderStatus = "pending";
  public identifier = "";
  public expires?: Date | undefined;
  public notBefore = new Date();
  public notAfter?: Date | undefined;
  public errorId?: string | number | undefined;
  public certificateId = "";
  public accountId?: string | number | undefined;

  public constructor(params: Partial<Order> = {}) {
    super(params);
  }

}
