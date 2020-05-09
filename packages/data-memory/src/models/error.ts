import { IError, ISubProblem } from "@peculiar/acme-data";
import { BaseObject } from "./base";
import { ErrorType } from "@peculiar/acme-core";

export class Error extends BaseObject implements IError {
  public subproblems?: ISubProblem[] | undefined;
  public type: ErrorType = ErrorType.serverInternal;
  public detail = "";

  public constructor(params: Partial<Error> = {}) {
    super(params);
  }

}
