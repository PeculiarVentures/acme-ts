import { IAuthorization, IIdentifier } from "@peculiar/acme-data";
import { AuthorizationStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";

export class Authorization extends BaseObject implements IAuthorization {
  public identifier: IIdentifier = { type: "", value: "" };
  public expires?: Date;
  public wildcard?: boolean;
  public accountId = 0;
  public status: AuthorizationStatus = "pending";

  public constructor(params: Partial<Authorization> = {}) {
    super(params);
  }

}
