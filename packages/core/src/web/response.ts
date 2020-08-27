import { Content } from "./content";
import { Headers } from "./headers";
import { HttpStatusCode } from "./http_status_code";

export class Response {
  public status = HttpStatusCode.ok;
  public headers = new Headers();
  public content?: Content;

  public json<T = any>() {
    if (this.content) {
      return this.content.toJSON<T>();
    }
    throw new Error("No content in ACME response");
  }
}