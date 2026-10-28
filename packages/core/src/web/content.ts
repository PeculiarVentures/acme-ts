import type { Error } from "@peculiar/acme-protocol";
import { AcmeError } from "../errors/acme_error";
import { isBufferSource, toArrayBuffer, utf8 } from "@peculiar/utils";

export enum ContentType {
  json = "application/json",
  joseJson = "application/jose+json",
  problemJson = "application/problem+json",
  pkix = "application/pkix-cert",
  pem = "application/pem-certificate-chain",
  pkcs7 = "application/pkcs7-mime",
}

export class Content {
  public type: string | ContentType;
  public content = new ArrayBuffer(0);

  /**
   * Initialize application/pem-certificate-chain content
   * @param pemChain
   */
  public constructor(pemChain: string);
  /**
   * Initialize application/problem-json content
   * @param error
   */
  public constructor(error: AcmeError);
  /**
   *
   * @param json Initialize application/json content
   */
  public constructor(json: any, formatted?: boolean);
  /**
   * Initialize type specified content
   * @param buffer Binary content
   * @param type Content type
   */
  public constructor(buffer: BufferSource, type: string | ContentType);
  public constructor(data: any, type?: boolean | string | ContentType) {
    if (typeof data === "string") {
      this.content = toArrayBuffer(utf8.encode(data));
      this.type = ContentType.pem;
    } else if (data instanceof AcmeError) {
      this.content = toArrayBuffer(
        utf8.encode(
          JSON.stringify({
            detail: data.message,
            type: data.type,
            subproblems: data.subproblems?.map((o) => {
              return { detail: o.message, type: o.type };
            }),
          } as Error),
        ),
      );
      this.type = ContentType.problemJson;
    } else if (isBufferSource(data)) {
      if (!type) {
        throw new TypeError("Cannot get required argument 'type'");
      }
      this.content = toArrayBuffer(data);
      this.type = type as string;
    } else {
      const json = type ? JSON.stringify(data, null, "  ") : JSON.stringify(data);
      this.content = toArrayBuffer(utf8.encode(json));
      this.type = ContentType.json;
    }
  }

  public toJSON<T = any>() {
    return JSON.parse(this.toString()) as T;
  }

  public toString() {
    return utf8.decode(this.content);
  }
}
