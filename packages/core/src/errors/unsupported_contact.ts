import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class UnsupportedContactError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.unsupportedContact, message, status, inner);
  }
}