import { diAccount, IAccountRepository } from "@peculiar/acme-data";
import { Account } from "../models";
import { BaseRepository } from "./base";
import { JsonWebKey } from "@peculiar/jose";

export class AccountRepository extends BaseRepository<Account> implements IAccountRepository {

  protected className = diAccount;

  public async findByPublicKey(publicKey: JsonWebKey) {
    const thumbprint = await publicKey.getThumbprint();
    return await this.findByIndex(`${thumbprint}`, `acct#`);
  }
}