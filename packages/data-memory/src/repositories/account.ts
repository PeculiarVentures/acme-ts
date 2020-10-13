import { IAccount, IAccountRepository } from "@peculiar/acme-data";
import { BaseRepository } from "./base";
import { JsonWebKey } from "@peculiar/jose";

export class AccountRepository extends BaseRepository<IAccount> implements IAccountRepository {

  public async findByPublicKey(publicKey: JsonWebKey) {
    const thumbprint = await publicKey.getThumbprint();
    const item = this.items.find(o => o.thumbprint === thumbprint);
    return item ? item : null;
  }
}
