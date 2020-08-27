import { Attribute as AsnAttribute } from "@peculiar/asn1-x509";
import { AsnData } from "./asn_data";

export class Attribute extends AsnData<AsnAttribute>{

  public type!: string;
  public values!: ArrayBuffer[];

  public constructor(raw: BufferSource) {
    super(raw, AsnAttribute);

  }

  protected onInit(asn: AsnAttribute): void {
    this.type = asn.type;
    this.values = asn.values;
  }
}
