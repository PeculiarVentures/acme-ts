import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web/http_status_code";

export class UserActionRequiredError extends AcmeError {
  constructor(
    message?: string,
    status: number = HttpStatusCode.forbidden,
    inner?: Error,
  ) {
    super(ErrorType.userActionRequired, message, status, inner);
  }
}