import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class IncorrectResponseError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.incorrectResponse, message, status, inner);
  }
}