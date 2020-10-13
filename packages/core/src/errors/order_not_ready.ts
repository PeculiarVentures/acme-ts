import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web/http_status_code";

export class OrderNotReadyError extends AcmeError {
  public constructor(
    message?: string,
    status: number = HttpStatusCode.forbidden,
    inner?: Error,
  ) {
    super(ErrorType.orderNotReady, message, status, inner);
  }
}
