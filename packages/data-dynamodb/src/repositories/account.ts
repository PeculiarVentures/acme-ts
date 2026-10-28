import type { IAccountRepository } from "@peculiar/acme-data";
import { diAccount } from "@peculiar/acme-data";
import type { Account } from "../models";
import { BaseRepository } from "./base";
import type { JsonWebKey } from "@peculiar/jose";

export class AccountRepository extends BaseRepository<Account> implements IAccountRepository {
  protected className = diAccount;

  public async findByPublicKey(publicKey: JsonWebKey) {
    const thumbprint = await publicKey.getThumbprint();
    return await this.findByIndex(`${thumbprint}`, `acct#`);
  }
}
