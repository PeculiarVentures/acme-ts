import { OrderStatus } from "@peculiar/acme-protocol";
import { IBaseObject, Key } from "./base";
import { IError } from "./error";

export const diOrder = "ACME.Models.Order";

export interface IOrder extends IBaseObject {
  /**
   * The status of this order. Possible values are "pending", "ready",
   * "processing", "valid", and "invalid".
   */
  status: OrderStatus;

  /**
   * Computed hash of a list of identifiers for quick searching. SHA256(Sort(LowCase(identifiers)))
   */
  identifier: string;

  /**
   * The timestamp after which the server will consider this order invalid,
   * encoded in the format specified in [RFC3339].  This field is REQUIRED
   * for objects with "pending" or "valid" in the status field.
   */
  expires?: Date;

  /**
   * The requested value of the notBefore field in the certificate.
   */
  notBefore?: Date;

  /**
   * The requested value of the notAfter field in the certificate.
   */
  notAfter?: Date;

  /**
   * The error that occurred while processing the order, if any.
   */
  error?: IError;

  /**
   * Enrolled certificate
   */
  certificate?: string;

  accountId?: Key;

  /**
   * Сertification authority for issuing certificates
   */
  endpoint?: string;
}