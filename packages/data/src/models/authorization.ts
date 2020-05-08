import { AuthorizationStatus } from "@peculiar/acme-protocol";
import { Key, IBaseObject } from "./base";
import { IIdentifier } from "./identifier";

export interface IAuthorization extends IBaseObject {
  /**
   * The identifier that the account is authorized to represent.
   */
  identifier: IIdentifier;

  /**
   * The status of this authorization.
   */
  status: AuthorizationStatus;

  /**
   * The timestamp after which the server will consider this authorization invalid
   */
  expires?: Date;

  /**
   * This field MUST be present and true
   * for authorizations created as a result of a newOrder request
   * containing a DNS identifier with a value that was a wildcard
   * domain name.For other authorizations, it MUST be absent
   */
  wildcard?: boolean;

  accountId: Key;
}