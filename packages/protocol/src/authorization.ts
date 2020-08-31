import { Identifier } from "./identifier";
import { Challenge } from "./challenge";

export type AuthorizationStatus = "pending" | "valid" | "invalid" | "deactivated" | "expired" | "revoked";

export interface Authorization {
  /**
   * The identifier that the account is authorized to represent.
   */
  identifier: Identifier;

  /**
   * The status of this authorization.
   */
  status: AuthorizationStatus;

  /**
   * The timestamp after which the server will consider this authorization invalid
   */
  expires?: string;

  /**
   * An array of challenges
   */
  challenges: Challenge[];

  /**
   * This field MUST be present and true
   * for authorizations created as a result of a newOrder request
   * containing a DNS identifier with a value that was a wildcard
   * domain name.For other authorizations, it MUST be absent
   */
  wildcard?: boolean;
}

export interface AuthorizationCreateParams {
  /**
   * An array of identifier objects that the order pertains to
   */
  identifier: Identifier;
}

export interface AuthorizationUpdateParams {
  /**
   * The status of this authorization.
   */
  status: AuthorizationStatus;
}