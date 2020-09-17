import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web/http_status_code";

export class ArgumentNullError extends AcmeError {
  public constructor(
    message?: string,
    status: number = HttpStatusCode.badRequest,
    inner?: Error,
  ) {
    super(ErrorType.malformed, message, status, inner);
  }
}