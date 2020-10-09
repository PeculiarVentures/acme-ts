export interface DirectoryMetadata {
  /**
   * A URL identifying the current terms of service
   */
  termsOfService?: string;

  /**
   * An HTTP or HTTPS URL locating a website providing more information
   * about the ACME server
   */
  website?: string;

  /**
   * The hostnames that the ACME server recognizes as referring to itself
   * for the purposes of CAA record validation
   *
   * NOTE:
   * Each string MUST represent the same sequence of ASCII code points
   * that the server will expect to see as the "Issuer Domain Name"
   * in a CAA issue or issuewild property tag.This allows clients
   * to determine the correct issuer domain name to use
   * when configuring CAA records
   */
  caaIdentities?: string[];

  /**
   * If this field is present and set to "true", then the CA requires
   * that all newAccount requests include an "externalAccountBinding"
   * field associating the new account with an external account
   */
  externalAccountRequired?: boolean;

  /**
   *
   */
  endpoints?: string[];
}

export interface Directory {
  /**
   * New nonce.
   */
  newNonce: string;

  /**
   * New account.
   */
  newAccount: string;

  /**
   * New authorization
   */
  newAuthz?: string;

  /**
   * New order.
   */
  newOrder: string;

  /**
   * Revoke certificate
   */
  revokeCert: string;

  /**
   * Key change
   */
  keyChange: string;

  /**
   * Metadata object
   */
  meta?: DirectoryMetadata;
}