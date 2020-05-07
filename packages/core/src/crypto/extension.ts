import { Extension as AsnExtension } from "@peculiar/asn1-x509";
import { AsnData } from "./asn_data";

export class Extension extends AsnData<AsnExtension>{

  public readonly type: string;
  public readonly critical: boolean;
  public readonly value: ArrayBuffer;

  public constructor(raw: BufferSource) {
    super(raw, AsnExtension);
    this.type = this.asn.extnID;
    this.critical = this.asn.critical;
    this.value = this.asn.extnValue;
  }
}
