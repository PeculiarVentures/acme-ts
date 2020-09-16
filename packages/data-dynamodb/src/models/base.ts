import { IBaseObject, Key } from "@peculiar/acme-data";
import { cryptoProvider } from "@peculiar/acme-core";
import { Convert } from "pvtsutils";

export interface IBaseDynamoObject {
  id: Key;
  index: string;
  parentId: string;
}

export abstract class BaseObject implements IBaseObject {
  public id = Convert.ToBase64Url(cryptoProvider.get().getRandomValues(new Uint8Array(20)));

  public constructor(
    params: Partial<BaseObject> = {}
  ) {
    Object.assign(this, params);
  }
  public abstract fromDynamo(data: IBaseDynamoObject): void;
  public abstract async toDynamo(): Promise<IBaseDynamoObject>;

  protected toDate(data: string) {
    return new Date(+data);
  }
  protected fromDate(data: Date) {
    return data.valueOf().toString();
  }
}