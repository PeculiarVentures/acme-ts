import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class BadCSRError extends AcmeError {
  public constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.badCSR, message, status, inner);
  }
}