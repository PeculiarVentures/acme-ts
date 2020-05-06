import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class ConnectionError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.connection, message, status, inner);
  }
}