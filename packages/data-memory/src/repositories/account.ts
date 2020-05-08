import { BaseRepository } from ".";
import { IAccount, IAccountRepository } from "@peculiar/acme-data";

export class AccountRepository extends BaseRepository<IAccount> implements IAccountRepository {
  public constructor() {
    super();
  }

  public findByPublicKey(publicKey: JsonWebKey): Promise<IAccount> {
    return new Promise<IAccount>(() => { return this.items.find(o => { o.key === publicKey; }); });
  }
}