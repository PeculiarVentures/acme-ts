import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class AccountDoesNotExistError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.accountDoesNotExist, message, status, inner);
  }
}