import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class BadRevocationReasonError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.badRevocationReason, message, status, inner);
  }
}