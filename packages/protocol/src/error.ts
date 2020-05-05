export interface Error {
  type: string;

  detail: string;

  subproblems?: Error[];
}