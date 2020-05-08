import { AcmeError } from "../errors";
import { Convert, BufferSourceConverter } from "pvtsutils";

export enum ContentType {
  json = "application/json",
  joseJson = "application/jose+json",
  problemJson = "application/problem+json",
  pkixCert = "application/pkix-cert",
  pemCertificateChain = "application/pem-certificate-chain",
  pkcs7Mime = "application/pkcs7-mime",
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
  public constructor(json: object);
  /**
   * Initialize type specified content
   * @param buffer Binary content
   * @param type Content type
   */
  public constructor(buffer: BufferSource, type: string | ContentType);
  public constructor(data: any, type?: string | ContentType) {
    if (typeof data === "string") {
      this.content = Convert.FromUtf8String(data);
      this.type = ContentType.pemCertificateChain;
    } else if (data instanceof AcmeError) {
      this.content = Convert.FromUtf8String(JSON.stringify(data));
      this.type = ContentType.problemJson;
    } else if (BufferSourceConverter.isBufferSource(data)) {
      if (!type) {
        throw new TypeError("Cannot get required argument 'type'");
      }
      this.content = BufferSourceConverter.toArrayBuffer(data);
      this.type = type;
    } else {
      this.content = Convert.FromUtf8String(JSON.stringify(data));
      this.type = ContentType.json;
    }
  }

  public toJSON() {
    return JSON.parse(this.toString());
  }

  public toString() {
    return Convert.ToUtf8String(this.content);
  }

}