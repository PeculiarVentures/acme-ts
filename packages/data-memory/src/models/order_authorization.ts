import { IOrderAuthorization } from "@peculiar/acme-data";
import { BaseObject } from "./base";

export class OrderAuthorization extends BaseObject implements IOrderAuthorization {
  public authorizationId = 0;
  public orderId = 0;

  public constructor(params: Partial<OrderAuthorization> = {}) {
    super(params);
  }

}
