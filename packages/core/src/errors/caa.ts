import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class CAAError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.caa, message, status, inner);
  }
}