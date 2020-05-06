import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class InvalidContactError extends AcmeError {
constructor(
     message?: string,
     status?: number,
     inner?: Error,
){
  super(ErrorType.invalidContact, message, status, inner)
}
}