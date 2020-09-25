import { Token } from ".";


export type AccountStatus = "valid" | "deactivated" | "revoked";

/**
 * JSON ACME account object.
 * See [RFC8555](https://tools.ietf.org/html/rfc8555#section-7.1.2)
 */
export interface Account {
  /**
   * The status of the account.
   */
  status: AccountStatus;

  /**
   * An array of URLs that the server can use to contact the client
   * for issues related to this account
   */
  contact?: string[];

  /**
   * Including this field in a newAccount request, with a value of true,
   * indicates the client's agreement with the terms of service.
   *
   * NOTE: This field cannot be updated by the client.
   */
  termsOfServiceAgreed?: boolean;

  /**
   * Including this field in a newAccount request indicates approval
   * by the holder of an existing non-ACME account to bind that account
   * to this ACME account.
   *
   * NOTE: This field is not updateable by the client</remarks>
   */
  externalAccountBinding?: unknown;

  /**
   * A URL from which a list of orders submitted by this account
   * can be fetched via a POST-as-GET request.
   *
   * Note: Property is required in RFC8555, but not all ACME servers support it
   */
  orders: string;
}

export interface AccountCreateParams {
  /**
   * An array of URLs that the server can use to contact the client
   * for issues related to this account
   */
  contact?: string[];

  /**
   * Including this field in a newAccount request, with a value of true,
   * indicates the client's agreement with the terms of service.
   *
   * NOTE: This field cannot be updated by the client.
   */
  termsOfServiceAgreed?: boolean;


  /**
   * Including this field in a newAccount request indicates approval
   * by the holder of an existing non-ACME account to bind that account
   * to this ACME account.
   *
   * NOTE: This field is not updateable by the client
   */
  externalAccountBinding?: JsonWebSignature;

  /**
   * If this field is present
   * with the value "true", then the server MUST NOT create a new
   * account if one does not already exist.This allows a client to
   * look up an account URL based on an account key.
   */
  onlyReturnExisting?: boolean;
}

export interface JsonWebSignature {
  protected: string;
  payload: string;
  signature: string;
}

export interface AccountUpdateParams {
  /**
   * An array of URLs that the server can use to contact the client
   * for issues related to this account
   */
  contact?: string[];

  /**
   * The status of the account.
   */
  status?: AccountStatus;
}

export interface ExternalAccountBinding {
  challenge: string;
  kid: string;
}

export interface CreateAccountProtocol {
  contact?: string[];
  termsOfServiceAgreed?: boolean;
  onlyReturnExisting?: boolean;
  externalAccountBinding?: Token;
}