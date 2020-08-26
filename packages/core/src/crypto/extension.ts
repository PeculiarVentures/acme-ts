import { AsnConvert, OctetString } from "@peculiar/asn1-schema";
import { Extension as AsnExtension } from "@peculiar/asn1-x509";
import { BufferSourceConverter } from "pvtsutils";
import { AsnData } from "./asn_data";

export class Extension extends AsnData<AsnExtension>{

  public readonly type: string;
  public readonly critical: boolean;
  public readonly value: ArrayBuffer;

  public constructor(raw: BufferSource);
  public constructor(type: string, critical: boolean, value: BufferSource);
  public constructor(...args: any[]) {
    let raw: ArrayBuffer;
    if (BufferSourceConverter.isBufferSource(args[0])) {
      raw = BufferSourceConverter.toArrayBuffer(args[0]);
    } else {
      raw = AsnConvert.serialize(new AsnExtension({
        extnID: args[0],
        critical: args[1],
        extnValue: new OctetString(BufferSourceConverter.toArrayBuffer(args[2])),
      }));
    }

    super(raw, AsnExtension);

    this.type = this.asn.extnID;
    this.critical = this.asn.critical;
    this.value = this.asn.extnValue.buffer;
  }
}
