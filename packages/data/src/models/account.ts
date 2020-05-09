import { IBaseObject } from "./base";
import { AccountStatus } from "@peculiar/acme-protocol";

export interface IAccount extends IBaseObject {
  status: AccountStatus;
  key: JsonWebKey;
  termsOfServiceAgreed: boolean;
  externalAccountId?: number;
  contacts: string[];
  createdAt: Date;
}