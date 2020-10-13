import { IError, ISubProblem } from "@peculiar/acme-data";
import { BaseObject, IBaseDynamoObject } from "./base";
import { ErrorType } from "@peculiar/acme-core";

export class DynamoError extends BaseObject implements IError {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public fromDynamo(data: IBaseDynamoObject): void {
    throw new Error("Method not implemented.");
  }
  public toDynamo(): Promise<IBaseDynamoObject> {
    throw new Error("Method not implemented.");
  }

  public subproblems?: ISubProblem[] | undefined;
  public type: ErrorType;
  public detail: string;

  public constructor(params: Partial<DynamoError> = {}) {
    super(params);

    this.type ??= ErrorType.serverInternal;
    this.detail ??= "";
  }

}
