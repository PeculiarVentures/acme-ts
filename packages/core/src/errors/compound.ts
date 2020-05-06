import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class CompoundError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.compound, message, status, inner);
  }
}