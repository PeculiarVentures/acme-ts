import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class RejectedIdentifierError extends AcmeError {
  public constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.rejectedIdentifier, message, status, inner);
  }
}
