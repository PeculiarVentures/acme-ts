import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class RejectedIdentifierError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.rejectedIdentifier, message, status, inner);
  }
}