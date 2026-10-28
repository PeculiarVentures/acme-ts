import type { IBaseRepository } from "./base";
import type { IExternalAccount } from "../models";

export const diExternalAccountRepository = "ACME.ExternalAccountRepository";

/**
 * ACME External account repository
 * DI: ACME.ExternalAccountRepository
 */
export type IExternalAccountRepository = IBaseRepository<IExternalAccount>;
