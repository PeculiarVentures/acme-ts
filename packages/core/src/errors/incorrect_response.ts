import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web";

export class IncorrectResponseError extends AcmeError {
  public constructor(
    message?: string,
    status = HttpStatusCode.badRequest,
    inner?: Error,
  ) {
    super(ErrorType.incorrectResponse, message, status, inner);
  }
}