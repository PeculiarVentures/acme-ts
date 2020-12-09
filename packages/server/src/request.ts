import * as core from "@peculiar/acme-core";
import * as data from "@peculiar/acme-data";

export class Request extends core.Request {
  public account: data.IAccount | null = null;
}
