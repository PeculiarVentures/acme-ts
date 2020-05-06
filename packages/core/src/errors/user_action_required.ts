import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class UserActionRequiredError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.userActionRequired, message, status, inner);
  }
}