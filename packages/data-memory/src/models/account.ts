import { IAccount } from "@peculiar/acme-data";
import { AccountStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";
import { JsonWebKey } from "@peculiar/jose";

export class Account extends BaseObject implements IAccount {
  public status: AccountStatus = "valid";
  public key!: JsonWebKey;
  public thumbprint!: string;
  public termsOfServiceAgreed = true;
  public externalAccountId?: number;
  public contacts: string[] = [];
  public createdAt: Date = new Date();

  public constructor(params: Partial<Account> = {}) {
    super(params);
  }

}
