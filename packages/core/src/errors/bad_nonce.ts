import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class BadNonceError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.badNonce, message, status, inner);
  }
}