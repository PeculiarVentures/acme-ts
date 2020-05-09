import { IAccount, IAccountRepository } from "@peculiar/acme-data";
import { BaseRepository } from "./base";

export class AccountRepository extends BaseRepository<IAccount> implements IAccountRepository {

  public async findByPublicKey(publicKey: JsonWebKey) {
    return this.items.find(o => { o.key === publicKey; }) || null;
  }
}