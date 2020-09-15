import { IIdentifier } from "@peculiar/acme-data";
import { BaseObject } from "./base";

export class Identifier extends BaseObject implements IIdentifier {
  public fromDynamo(data: any): void {
    throw new Error("Method not implemented.");
  }
  public toDynamo(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public type: string;
  public value: string;

  public constructor(params: Partial<Identifier> = {}) {
    super(params);

    this.type ??= "";
    this.value ??= "";
  }

}
