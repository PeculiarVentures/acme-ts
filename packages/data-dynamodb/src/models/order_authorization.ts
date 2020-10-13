import { IOrderAuthorization, Key } from "@peculiar/acme-data";
import { BaseObject, IBaseDynamoObject } from "./base";

export class OrderAuthorization extends BaseObject implements IOrderAuthorization {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public fromDynamo(data: IBaseDynamoObject): void {
    throw new Error("Method not implemented.");
  }
  public toDynamo(): Promise<IBaseDynamoObject> {
    throw new Error("Method not implemented.");
  }

  public authorizationId: Key;
  public orderId: Key;

  public constructor(params: Partial<OrderAuthorization> = {}) {
    super(params);

    this.authorizationId ??= "";
    this.orderId ??= "";
  }
}
