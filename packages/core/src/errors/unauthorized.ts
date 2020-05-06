import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class UnauthorizedError extends AcmeError {
constructor(
     message?: string,
     status?: number,
     inner?: Error,
){
  super(ErrorType.unauthorized, message, status, inner)
}
}