import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class ServerInternalError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.serverInternal, message, status, inner);
  }
}