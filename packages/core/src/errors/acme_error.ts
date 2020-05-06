import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web/http_status_code";

export class AcmeError extends Error {

  constructor(
    public type: ErrorType,
    public message: string = "",
    public status: number = HttpStatusCode.internalServerError,
    public inner?: Error,
  ) {
    super(message);
    this.name = "AcmeError";
  }
}
