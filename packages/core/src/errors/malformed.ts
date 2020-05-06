import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class MalformedError extends AcmeError {
constructor(
     message?: string,
     status?: number,
     inner?: Error,
){
  super(ErrorType.malformed, message, status, inner)
}
}