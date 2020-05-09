import { IAccount } from "../models";
import { IBaseRepository } from "./base";

export const diAccountRepository = "ACME.AccountRepository";

/**
 * ACME Account repository
 *
 * DI: ACME.AccountRepository
 */
export interface IAccountRepository extends IBaseRepository<IAccount> {
  findByPublicKey(publicKey: JsonWebKey): Promise<IAccount | null>;
}