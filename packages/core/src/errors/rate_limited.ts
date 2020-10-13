import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class RateLimitedError extends AcmeError {
  public constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.rateLimited, message, status, inner);
  }
}
