import { IAccount, IAccountRepository } from "@peculiar/acme-data";
import { BaseRepository } from "./base";
import { JsonWebKey } from "@peculiar/jose";
import { cryptoProvider } from "@peculiar/acme-core";

export class AccountRepository extends BaseRepository<IAccount> implements IAccountRepository {

  public async findByPublicKey(publicKey: JsonWebKey) {
    const thumbprint = await publicKey.getThumbprint();
    for (const item of this.items) {
      const key = new JsonWebKey(cryptoProvider.get(), item.key);
      if (await key.getThumbprint() === thumbprint) {
        return item;
      }
    }
    return null;
  }
}