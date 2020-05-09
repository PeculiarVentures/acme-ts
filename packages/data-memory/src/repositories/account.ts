import { BaseRepository } from ".";
import { IAccount, IAccountRepository } from "@peculiar/acme-data";

export class AccountRepository extends BaseRepository<IAccount> implements IAccountRepository {

  public async findByPublicKey(publicKey: JsonWebKey) {
    return this.items.find(o => { o.key === publicKey; }) || null;
  }
}