import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class UnsupportedContactError extends AcmeError {
  public constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.unsupportedContact, message, status, inner);
  }
}