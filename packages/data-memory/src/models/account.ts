import { IAccount, Key } from "@peculiar/acme-data";
import { AccountStatus } from "@peculiar/acme-protocol";
import { BaseObject } from ".";

export class Account extends BaseObject implements IAccount {
  public constructor(
    public id: Key,
    public status: AccountStatus = "valid",
    public key: JsonWebKey,
    public termsOfServiceAgreed: boolean = true,
    public externalAccountId?: Key,
    public contacts: string[] = [],
    public createdAt: Date = new Date(),
  ) {
    super(id);
  }

}
