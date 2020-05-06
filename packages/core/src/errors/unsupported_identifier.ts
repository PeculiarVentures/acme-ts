import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class UnsupportedIdentifierError extends AcmeError {
  public constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.unsupportedIdentifier, message, status, inner);
  }
}