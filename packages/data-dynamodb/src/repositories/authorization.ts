import * as acmeData from "@peculiar/acme-data";
import { Identifier } from "@peculiar/acme-protocol";
import { Authorization } from "../models";
import { BaseRepository } from "./base";

export class AuthorizationRepository extends BaseRepository<Authorization> implements acmeData.IAuthorizationRepository {

  protected className = acmeData.diAuthorization;

  public async findByIdentifier(accountId: acmeData.Key, identifier: Identifier) {
    const index = `authz#${await Authorization.getHashIdentifier(identifier)}`;
    return await this.findByIndex(accountId.toString(), index);
  }
}