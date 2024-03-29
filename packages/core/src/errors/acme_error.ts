import { ErrorType } from "./error_type";
import { HttpStatusCode } from "../web/http_status_code";

export class AcmeError extends Error {
  public subproblems?: AcmeError[];

  public constructor(
    public type: string | ErrorType,
    public override message: string = "",
    public status: number = HttpStatusCode.internalServerError,
    public inner?: Error,
  ) {
    super(message);
    this.name = "AcmeError";
  }
}
