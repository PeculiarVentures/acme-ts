import { IBaseObject } from "@peculiar/acme-data";
import { cryptoProvider } from "@peculiar/acme-core";
import { Convert } from "pvtsutils";

export abstract class BaseObject implements IBaseObject {
  public id = Convert.ToBase64Url(cryptoProvider.get().getRandomValues(new Uint8Array(20)));
  public index = "";
  public parentId = "";

  public constructor(
    params: Partial<BaseObject> = {}
  ) {
    Object.assign(this, params);
  }
  public abstract fromDynamo(data: any): void;
  public abstract async toDynamo(): Promise<void>;
}