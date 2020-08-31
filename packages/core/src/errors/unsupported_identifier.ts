import { HttpStatusCode } from "../web/http_status_code";
import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class UnsupportedIdentifierError extends AcmeError {
  public constructor(
    message?: string,
    status: number = HttpStatusCode.forbidden,
    inner?: Error,
  ) {
    super(ErrorType.unsupportedIdentifier, message, status, inner);
  }
}