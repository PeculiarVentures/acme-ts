import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class UnsupportedIdentifierError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.unsupportedIdentifier, message, status, inner);
  }
}