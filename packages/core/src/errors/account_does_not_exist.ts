import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web/http_status_code";

export class AccountDoesNotExistError extends AcmeError {
  public constructor(
    message = "Account does not exist",
    status: number = HttpStatusCode.badRequest,
    inner?: Error,
  ) {
    super(ErrorType.accountDoesNotExist, message, status, inner);
  }
}