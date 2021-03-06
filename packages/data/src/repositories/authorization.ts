import { IBaseRepository } from "./base";
import { IAuthorization, Key } from "../models";
import { Identifier } from "@peculiar/acme-protocol";

export const diAuthorizationRepository = "ACME.AuthorizationRepository";

export interface IAuthorizationRepository extends IBaseRepository<IAuthorization> {
  /**
   * Returns the last authorization with specified identifier
   * @param accountId Account ID
   * @param identifier Identifier
   */
  findByIdentifier(accountId: Key, identifier: Identifier): Promise<IAuthorization | null>;
}
