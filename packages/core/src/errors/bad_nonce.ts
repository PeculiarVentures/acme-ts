import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web/http_status_code";

export class BadNonceError extends AcmeError {
  public constructor(
    message = "Bad nonce",
    status: number = HttpStatusCode.badRequest,
    inner?: Error,
  ) {
    super(ErrorType.badNonce, message, status, inner);
  }
}
