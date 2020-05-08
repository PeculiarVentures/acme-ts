import { IBaseObject, Key } from "@peculiar/acme-data";

export abstract class BaseObject implements IBaseObject {
  public constructor(public id: Key) { }
}