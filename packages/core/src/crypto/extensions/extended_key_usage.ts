import { ExtendedKeyUsage, id_ce_extKeyUsage } from "@peculiar/asn1-x509";
import { AsnConvert } from "@peculiar/asn1-schema";
import { BufferSourceConverter } from "pvtsutils";
import { Extension } from "../extension";

export class ExtendedKeyUsageExtension extends Extension {
  public readonly usages: string[];

  public constructor(raw: BufferSource);
  public constructor(usages: string[], critical?: boolean);
  public constructor(...args: any[]) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);

      const value = AsnConvert.parse(this.value, ExtendedKeyUsage);
      this.usages = value.map(o => o);
    } else {
      const value = new ExtendedKeyUsage(args[0]);
      super(id_ce_extKeyUsage, args[1], AsnConvert.serialize(value));

      this.usages = args[0];
    }
  }
}
