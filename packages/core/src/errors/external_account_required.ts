import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class ExternalAccountRequiredError extends AcmeError {
constructor(
     message?: string,
     status?: number,
     inner?: Error,
){
  super(ErrorType.externalAccountRequired, message, status, inner)
}
}