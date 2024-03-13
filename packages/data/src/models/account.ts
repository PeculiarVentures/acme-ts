import { IBaseObject, Key } from "./base";
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
  thumbprint: string;
  termsOfServiceAgreed?: boolean;
  externalAccountId?: Key;
  providerIdentifier?: string;
  contacts?: string[];
  createdAt: Date;
}
