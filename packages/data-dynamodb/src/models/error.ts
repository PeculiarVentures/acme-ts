import { IError, ISubProblem } from "@peculiar/acme-data";
import { BaseObject } from "./base";
import { ErrorType } from "@peculiar/acme-core";

export class Error extends BaseObject implements IError {
  public fromDynamo(data: any): void {
    // Empty
  }
  public async toDynamo(): Promise<void> {
    // Empty
  }
  public subproblems?: ISubProblem[] | undefined;
  public type: ErrorType;
  public detail: string;

  public constructor(params: Partial<Error> = {}) {
    super(params);

    this.type ??= ErrorType.serverInternal;
    this.detail ??= "";
  }

}
