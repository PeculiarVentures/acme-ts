import { IBaseObject } from "@peculiar/acme-data";

export abstract class BaseObject implements IBaseObject {
  public id = 0;
  public constructor(
    params: Partial<BaseObject> = {}
  ) {
    Object.assign(this, params);
  }
}