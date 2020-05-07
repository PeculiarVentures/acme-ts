import { Attribute as AsnAttribute } from "@peculiar/asn1-x509";
import { AsnData } from "./asn_data";

export class Attribute extends AsnData<AsnAttribute>{

  public readonly type: string;
  public readonly values: ArrayBuffer[];

  public constructor(raw: BufferSource) {
    super(raw, AsnAttribute);

    this.type = this.asn.type;
    this.values = this.asn.values;
  }
}
