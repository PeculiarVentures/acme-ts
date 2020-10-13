import { Identifier } from "./identifier";
import { Error } from "./error";

export type OrderStatus = "pending" | "ready" | "processing" | "valid" | "invalid";

/**
 * JSON ACME account object.
 * See [RFC8555](https://tools.ietf.org/html/rfc8555#section-7.1.3)
 */
export interface Order {
  /**
   * The status of this order. Possible values are "pending", "ready",
   * "processing", "valid", and "invalid".
   */
  status: OrderStatus;

  /**
   * The timestamp after which the server will consider this order invalid,
   * encoded in the format specified in [RFC3339].  This field is REQUIRED
   * for objects with "pending" or "valid" in the status field.
   */
  expires?: string;

  /**
   * An array of identifier objects that the order pertains to
   */
  identifiers: Identifier[];
  /**
   * The requested value of the notBefore field in the certificate.
   *
   * NODE: in the date format defined in `RFC3339`
   */
  notBefore?: string;

  /**
   * The requested value of the notAfter field in the certificate.
   *
   * NODE: in the date format defined in `RFC3339`
   */
  notAfter?: string;

  /**
   * The error that occurred while processing the order, if any.
   */
  error?: Error;

  /**
   * An array of authorization objects
   */
  authorizations: string[];

  /**
   * A URL that a CSR must be POSTed to once
   * all of the order's authorizations are satisfied to finalize the
   * order.The result of a successful finalization will be the
   * population of the certificate URL for the order.
   */
  finalize: string;

  /**
   * A URL for the certificate that has been issued in response to this order.
   */
  certificate?: string;

  endpoint?: string;
}

export interface OrderList {
  orders: string[];
}

export interface OrderCreateParams {
  /**
   * An array of identifier objects that the order pertains to
   */
  identifiers: Identifier[];

  /**
   * The requested value of the notBefore field in the certificate.
   *
   * NOTE: in the date format defined in RFC3339
   */
  notBefore?: Date;

  /**
   * The requested value of the notAfter field in the certificate.
   *
   * NOTE: in the date format defined in RFC3339
   */
  notAfter?: Date;

}

/**
 * Reasons for revocation.
 * See [RFC5280](https://tools.ietf.org/html/rfc5280#section-5.3.1)
 */
export enum RevokeReason {
  unspecified = 0,
  keyCompromise = 1,
  caCompromise = 2,
  affiliationChanged = 3,
  superseded = 4,
  cessationOfOperation = 5,
  certificateHold = 6,
  /*Value 7 is not used*/
  removeFromCrl = 8,
  privilegeWithdrawn = 9,
  aaCompromise = 10
}

/**
 * Certificate Revocation.
 * See [RFC8555](https://tools.ietf.org/html/draft-ietf-acme-acme-18#section-7.6)
 */
export interface RevokeCertificateParams {
  /**
   * The certificate to be revoked, in the base64url-encoded version of the DER format.
   */
  certificate: string;

  /**
   * One of the revocation reasonCodes to be used when generating OCSP responses and CRLs.
   */
  reason: number;
}

export interface FinalizeParams {
  csr: string;
  endpoint?: string;
}
