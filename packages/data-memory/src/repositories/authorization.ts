import { IAuthorization, IAuthorizationRepository } from "@peculiar/acme-data";
import { Identifier } from "@peculiar/acme-protocol";
import { BaseRepository } from "./base";

export class AuthorizationRepository extends BaseRepository<IAuthorization> implements IAuthorizationRepository {

  public async findByIdentifier(accountId: number, identifier: Identifier) {
    const items = this.items.filter(o => o.accountId === accountId && o.identifier === identifier);
    return items[items.length - 1] || null;
  }
}