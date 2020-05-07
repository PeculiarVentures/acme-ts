import { JsonWebSignature } from "../jose";

export type RequestMethod = "GET" | "POST" | "HEAD";

export interface QueryParams {
  [name: string]: string[];
}

export class Request {
  public method: RequestMethod = "GET";
  public path = "";
  public queryParams: QueryParams = {};
  public body?: JsonWebSignature;
}