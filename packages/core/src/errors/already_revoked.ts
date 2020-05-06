import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class AlreadyRevokedError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.alreadyRevoked, message, status, inner);
  }
}