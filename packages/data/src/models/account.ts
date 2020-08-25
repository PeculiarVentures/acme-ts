import { IBaseObject, Key } from "./base";
import { AccountStatus } from "@peculiar/acme-protocol";
import { JsonWebKey } from "@peculiar/jose";

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
  externalAccountId?: Key;
  contacts: string[];
  createdAt: Date;
}