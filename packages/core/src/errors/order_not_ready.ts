import { AcmeError } from "./acme_error";
import { ErrorType } from "./error_type";

export class OrderNotReadyError extends AcmeError {
constructor(
     message?: string,
     status?: number,
     inner?: Error,
){
  super(ErrorType.orderNotReady, message, status, inner)
}
}