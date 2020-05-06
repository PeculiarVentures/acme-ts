import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class DNSError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.dns, message, status, inner);
  }
}