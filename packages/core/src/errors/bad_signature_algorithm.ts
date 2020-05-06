import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class BadSignatureAlgorithmError extends AcmeError {
  constructor(
    message?: string,
    status?: number,
    inner?: Error,
  ) {
    super(ErrorType.badSignatureAlgorithm, message, status, inner);
  }
}