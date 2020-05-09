import { IExternalAccount, ExternalAccountStatus } from "@peculiar/acme-data";
import { BaseObject } from "./base";

export class ExternalAccount extends BaseObject implements IExternalAccount {
  public key = "";
  public expires?: Date | undefined;
  public account: any;
  public status: ExternalAccountStatus = "pending";

  public constructor(params: Partial<ExternalAccount> = {}) {
    super(params);
  }

}
