import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class CAAError extends AcmeError {
  public constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.caa, message, status, inner);
  }
}
