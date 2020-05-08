import { IBaseObject } from "./base";
import { ErrorType } from "@peculiar/acme-core";

export interface ISubProblem {
  type: ErrorType;
  detail: string;
}

export interface IError extends ISubProblem, IBaseObject {
  subproblems?: ISubProblem[];
}

