import { IAuthorization, IIdentifier } from "@peculiar/acme-data";
import { AuthorizationStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";

export class Authorization extends BaseObject implements IAuthorization {
  public identifier!: IIdentifier;
  public expires?: Date | undefined;
  public wildcard?: boolean | undefined;
  public accountId = 0;
  public status: AuthorizationStatus = "pending";

  public constructor(params: Partial<Authorization> = {}) {
    super(params);
  }

}
