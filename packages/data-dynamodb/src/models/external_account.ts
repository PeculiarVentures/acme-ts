import { IExternalAccount, ExternalAccountStatus } from "@peculiar/acme-data";
import { BaseObject, IBaseDynamoObject } from "./base";

export interface IExternalAccountDynamo extends IBaseDynamoObject {
  expires?: string;
  account: any;
  status: ExternalAccountStatus;
}

export class ExternalAccount extends BaseObject implements IExternalAccount {

  public key: string;
  public expires?: Date;
  public account: any;
  public status: ExternalAccountStatus;

  public constructor(params: Partial<ExternalAccount> = {}) {
    super(params);

    this.key ??= "";
    this.account ??= {};
    this.status ??= "pending";
  }

  public async toDynamo() {
    const dynamo: IExternalAccountDynamo = {
      id: this.id,
      index: "extAccount#",
      parentId: this.key,
      account: this.account,
      status: this.status,
    };
    if (this.expires) {
      dynamo.expires = this.fromDate(this.expires);
    }
    return dynamo;
  }

  public fromDynamo(data: IExternalAccountDynamo) {
    this.key = data.parentId;
    if (data.expires) {
      this.expires = this.toDate(data.expires);
    }
    this.account = data.account;
    this.status = data.status;
  }
}
