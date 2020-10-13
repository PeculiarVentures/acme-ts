export type RequestMethod = "GET" | "POST" | "HEAD";

export interface QueryParams {
  [name: string]: string[] | undefined;
  cursor?: string[];
}

export class Request {
  public header: {[name: string]: string | undefined} = {};
  public method: RequestMethod = "GET";
  public path = "";
  public queryParams: QueryParams = {};
  public body?: any;

  public constructor(params: Partial<Request> = {}) {
    Object.assign(this, params);
  }
}
