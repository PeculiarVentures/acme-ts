import { IBaseObject } from "./base";
import { ErrorType } from "@peculiar/acme-core";

export interface ISubProblem {
  type: ErrorType;
  detail: string;
}

export const diError = "ACME.Models.Error"

export interface IError extends ISubProblem, IBaseObject {
  subproblems?: ISubProblem[];
}

