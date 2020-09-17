import { IAccount } from "@peculiar/acme-data";
import { AccountStatus } from "@peculiar/acme-protocol";
import { BaseObject, IBaseDynamoObject } from "./base";
import { JsonWebKey } from "@peculiar/jose";
import { cryptoProvider } from "@peculiar/acme-core";

export interface IAccountDynamo extends IBaseDynamoObject {
  status: AccountStatus;
  key: JsonWebKey;
  termsOfServiceAgreed: boolean;
  externalAccountId?: number;
  contacts: string[];
  createdAt: string;
}

export class Account extends BaseObject implements IAccount {
  public status: AccountStatus;
  public key: JsonWebKey;
  public thumbprint: string;
  public termsOfServiceAgreed: boolean;
  public externalAccountId?: number;
  public contacts: string[];
  public createdAt: Date;

  public constructor(params: Partial<Account> = {}) {
    super(params);

    this.key ??= new JsonWebKey(cryptoProvider.get());
    this.thumbprint ??= "";
    this.status ??= "valid";
    this.termsOfServiceAgreed ??= true;
    this.contacts ??= [];
    this.createdAt ??= new Date();
  }

  public async toDynamo() {
    const dynamo: IAccountDynamo = {
      id: this.id,
      index: "acct#",
      parentId: this.thumbprint,
      status: this.status,
      key: this.key,
      termsOfServiceAgreed: this.termsOfServiceAgreed,
      contacts: this.contacts,
      createdAt: this.fromDate(this.createdAt),
    };
    if (this.externalAccountId) {
      dynamo.externalAccountId = this.externalAccountId;
    }
    return dynamo;
  }

  public fromDynamo(data: IAccountDynamo) {
    this.status = data.status;
    this.key = new JsonWebKey(cryptoProvider.get(), data.key);
    this.thumbprint = data.parentId;
    this.termsOfServiceAgreed = data.termsOfServiceAgreed;
    this.contacts = data.contacts;
    this.createdAt = this.toDate(data.createdAt);
    if (data.externalAccountId) {
      this.externalAccountId = data.externalAccountId;
    }
  }

}
