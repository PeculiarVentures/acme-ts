import { IAccount, IAccountRepository } from "@peculiar/acme-data";
import { BaseRepository } from "./base";
import { JsonWebKey } from "@peculiar/jose";

export class AccountRepository extends BaseRepository<IAccount> implements IAccountRepository {

  public async findByPublicKey(publicKey: JsonWebKey) {
    const thumbprint = await publicKey.getThumbprint();
    for (const item of this.items) {
      if (await item.key.getThumbprint() === thumbprint) {
        return item;
      }
    }
    return null;
  }
}