import { IAccount } from "@peculiar/acme-data";
import { AccountStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";
import { JsonWebKey } from "@peculiar/jose";
import { cryptoProvider } from "@peculiar/acme-core";

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
    this.index = "acct#";
    this.parentId = this.thumbprint;
  }

  public fromDynamo(data: any) {
    this.status = data.status;
    this.key = new JsonWebKey(cryptoProvider.get(), data.key);
    this.thumbprint = data.thumbprint;
    this.termsOfServiceAgreed = data.termsOfServiceAgreed;
    this.contacts = data.contacts;
    this.createdAt = data.createdAt;
    if (data.externalAccountId) {
      this.externalAccountId = data.externalAccountId;
    }
  }

}
