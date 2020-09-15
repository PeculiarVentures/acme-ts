import { IExternalAccount, ExternalAccountStatus } from "@peculiar/acme-data";
import { BaseObject } from "./base";

export class ExternalAccount extends BaseObject implements IExternalAccount {

  public key: string;
  public expires?: Date | undefined;
  public account: any;
  public status: ExternalAccountStatus;

  public constructor(params: Partial<ExternalAccount> = {}) {
    super(params);

    this.key ??= "";
    this.account ??= {};
    this.status ??= "pending";
  }

  public async toDynamo(): Promise<void> {
    this.index = "extAccount#";
    this.parentId = this.key;
  }

  public fromDynamo(data: any): void {
    this.key = data.key;
    if (data.expires) {
      this.expires = data.expires;
    }
    this.account = data.account;
    this.status = data.status;
  }
}
