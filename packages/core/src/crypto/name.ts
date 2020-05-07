import { Name as AsnName } from "@peculiar/asn1-x509";
import { AsnConvert } from "@peculiar/asn1-schema";

const names: [string, string][] = [
  ["CN", "2.5.4.3"],
  ["C", "2.5.4.6"],
  ["DC", "0.9.2342.19200300.100.1.25"],
  ["E", "1.2.840.113549.1.9.1"],
  ["G", "2.5.4.42"],
  ["I", "2.5.4.43"],
  ["L", "2.5.4.7"],
  ["O", "2.5.4.10"],
  ["OU", "2.5.4.11"],
  ["ST", "2.5.4.8"],
  ["SN", "2.5.4.4"],
  ["T", "2.5.4.12"],
];

export class Name {

  private asn = new AsnName();

  public constructor(data: BufferSource | AsnName) {
    this.asn = data instanceof AsnName
      ? data
      : AsnConvert.parse(data, AsnName);
    // todo fill class props
  }

  public toString(splitter = ", ") {
    // Serialization spec https://tools.ietf.org/html/rfc2253
    return this.asn
      .map(o => o
        .map(a => `${names.filter(n => n[1] === a.type)[0]?.[0] || a.type}=${/[,=+<>#;]/.test(a.value.toString()) ? `"${a.value}"` : a.value}`)
        .join(splitter))
      .join(splitter);
  }
}