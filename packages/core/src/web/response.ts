import { Content } from "./content";
import { Headers } from "./headers";
import { HttpStatusCode } from "./http_status_code";

export class Response {
  public status = HttpStatusCode.noContent;
  public headers = new Headers();
  public content?: Content;
}