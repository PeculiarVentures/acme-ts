import { AsnConvert, OctetString } from "@peculiar/asn1-schema";
import { Extension as AsnExtension } from "@peculiar/asn1-x509";
import { BufferSourceConverter } from "pvtsutils";
import { AsnData } from "./asn_data";

export class Extension extends AsnData<AsnExtension>{

  public type!: string;
  public critical!: boolean;
  public value!: ArrayBuffer;

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
  }

  protected onInit(asn: AsnExtension) {
    this.type = asn.extnID;
    this.critical = asn.critical;
    this.value = asn.extnValue.buffer;
  }
}
