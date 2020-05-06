/// <summary>
/// PEM converter

import { Convert } from "./convert";

/// </summary>
export class PemConverter {

  public CertificateTag = "CERTIFICATE";
  public CertificateRequestTag = "CERTIFICATE REQUEST";
  public PublicKeyTag = "PUBLIC KEY";
  public PrivateKeyTag = "PRIVATE KEY";

  /// <summary>
  /// Converts PEM to byte[]
  /// </summary>
  /// <param name="pem">PEM string</param>
  /// <returns></returns>
  public static decode(pem: string) //byte[][]
  {
    if (!pem) {
      throw new Error("pem is empty");
      // throw new ArgumentNullException(nameof(pem));
    }

    const pattern = "-{5}BEGIN [A-Z0-9 ]+-{5}([a-zA-Z0-9=+\\/\\n\\r]+)-{5}END [A-Z0-9 ]+-{5}";
    const matches = pem.match(pattern);
    const res = new Array<number[]>();

    if (matches) {
      matches.forEach(element => {
        const base64 = element
          .replace("\r", "")
          .replace("\n", "");
        res.push(Convert.fromBase64String(base64));
      });
    }
    return res;
  }

  /// <summary>
  /// Converts byte[] to PEM
  /// </summary>
  /// <param name="rawData"></param>
  /// <param name="tag"></param>
  /// <returns></returns>
  public static encode(rawData: number[], tag: string) {
    if (!rawData) {
      throw new Error("todo");
      // throw new ArgumentNullException(nameof(rawData));
    }
    if (!tag) {
      throw new Error("todo");
      // throw new ArgumentException("message", nameof(tag));
    }

    const base64 = Convert.toBase64String(rawData);
    let sliced: string;
    let offset = 0;
    let rows = Array<string>();
    while (offset < base64.length) {
      if (base64.length - offset < 64) {
        sliced = base64.substring(offset);
      }
      else {
        sliced = base64.substring(offset, 64);
        offset += 64;
      }
      if (sliced.length != 0) {
        rows.push(sliced);
        if (sliced.length < 64) {
          break;
        }
      }
      else {
        break;
      }
    }
    const upperCaseTag = tag.toLocaleUpperCase();
    return `-----BEGIN ${upperCaseTag}-----\n${rows.join("\n")}\n-----END ${upperCaseTag}-----`;
  }

  /// <summary>
  /// Converts array byte[] to PEM
  /// </summary>
  /// <param name="rawData"></param>
  /// <param name="tag"></param>
  /// <returns></returns>
  public static encodeArray(rawData: Array<number[]>, tag: string) {
    let raws = new Array<string>();
    rawData.forEach(element => {
      raws.push(this.encode(element, tag));
    });
    return raws.join("\n");
  }
}