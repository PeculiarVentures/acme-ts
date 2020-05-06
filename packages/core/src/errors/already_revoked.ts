import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web/http_status_code";

export class AlreadyRevokedError extends AcmeError {
  constructor(
    message?: string,
    status: number = HttpStatusCode.badRequest,
    inner?: Error,
  ) {
    super(ErrorType.alreadyRevoked, message, status, inner);
  }
}