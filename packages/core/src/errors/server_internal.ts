import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class ServerInternalError extends AcmeError {
  public constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.serverInternal, message, status, inner);
  }
}
