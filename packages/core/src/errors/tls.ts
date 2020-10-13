import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class TLSError extends AcmeError {
  public constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.tls, message, status, inner);
  }
}
