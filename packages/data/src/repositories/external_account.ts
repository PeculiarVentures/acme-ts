import { IBaseRepository } from "./base";
import { IExternalAccount } from "../models";

export const diExternalAccountRepository = "ACME.ExternalAccountRepository";

/**
 * ACME External account repository
 * DI: ACME.ExternalAccountRepository
 */
export type IExternalAccountRepository = IBaseRepository<IExternalAccount>
