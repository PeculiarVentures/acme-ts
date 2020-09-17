import { HttpStatusCode } from "../web";
import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class BadCSRError extends AcmeError {
  public constructor(
    message?: string,
    status: number = HttpStatusCode.forbidden,
    inner?: Error,
  ) {
    super(ErrorType.badCSR, message, status, inner);
  }
}