import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web/http_status_code";

export class UnauthorizedError extends AcmeError {
  public constructor(
    message?: string,
    status: number = HttpStatusCode.unauthorized,
    inner?: Error,
  ) {
    super(ErrorType.unauthorized, message, status, inner);
  }
}