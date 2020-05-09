import { IIdentifier } from "@peculiar/acme-data";
import { BaseObject } from "./base";

export class Identifier extends BaseObject implements IIdentifier {
  public type = "";
  public value = "";

  public constructor(params: Partial<Identifier> = {}) {
    super(params);
  }

}
