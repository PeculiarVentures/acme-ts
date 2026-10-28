import type { IBaseRepository } from "./base";
import type { IAuthorization, Key } from "../models";
import type { Identifier } from "@peculiar/acme-protocol";

export const diAuthorizationRepository = "ACME.AuthorizationRepository";

export interface IAuthorizationRepository extends IBaseRepository<IAuthorization> {
  /**
   * Returns the last authorization with specified identifier
   * @param accountId Account ID
   * @param identifier Identifier
   */
  findByIdentifier(accountId: Key, identifier: Identifier): Promise<IAuthorization | null>;
}
