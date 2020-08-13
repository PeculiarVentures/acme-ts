import { IBaseObject } from "./base";
import { AccountStatus } from "@peculiar/acme-protocol";

export const diAccount = "ACME.Models.Account";

/**
 * ACME Account model
 *
 * DI: ACME.Account
 */
export interface IAccount extends IBaseObject {
  status: AccountStatus;
  key: JsonWebKey;
  termsOfServiceAgreed: boolean;
  externalAccountId?: number;
  contacts: string[];
  createdAt: Date;
}