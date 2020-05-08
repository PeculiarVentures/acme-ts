import { IBaseObject } from "./base";

export type ExternalAccountStatus =
  /**
   * External Account was created and ready for binding to ACME Account
   */
  "pending" |
  /**
   * External Account Key expired
   */
  "expired" |

  /**
   * External Account key verified
   */
  "valid" |
  "invalid";

export interface IExternalAccount extends IBaseObject {
  key: string;
  expires?: Date;
  account: any;
  status: ExternalAccountStatus;
}