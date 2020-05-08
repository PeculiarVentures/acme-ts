import { IBaseRepository } from "./base";
import { IAuthorization, Key } from "../models";
import { Identifier } from "@peculiar/acme-protocol";

export interface IAuthorizationRepository extends IBaseRepository<IAuthorization> {
  /**
   * Returns the last authz with specified identifier
   * @param accountId Account ID
   * @param identifier Identifier
   */
  findByIdentifier(accountId: Key, identifier: Identifier): Promise<IAuthorization>;
}
