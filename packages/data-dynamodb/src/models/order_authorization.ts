import { IOrderAuthorization, Key } from "@peculiar/acme-data";
import { BaseObject } from "./base";

export class OrderAuthorization extends BaseObject implements IOrderAuthorization {

  public authorizationId: Key;
  public orderId: Key;

  public constructor(params: Partial<OrderAuthorization> = {}) {
    super(params);

    this.authorizationId ??= "";
    this.orderId ??= "";
  }

  public async toDynamo(): Promise<void> {
    // Empty
  }

  public fromDynamo(data: any): void {
    // Empty
  }
}
