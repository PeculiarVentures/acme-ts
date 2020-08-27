import { AsnConvert } from "@peculiar/asn1-schema";
import { BasicConstraints as AsnBasicConstraints, id_ce_basicConstraints } from "@peculiar/asn1-x509";
import { BufferSourceConverter } from "pvtsutils";
import { Extension } from "../extension";

export class BasicConstraintsExtension extends Extension {
  public readonly ca: boolean;
  public readonly pathLength?: number;

  public constructor(raw: BufferSource);
  public constructor(ca: boolean, pathLength?: number, critical?: boolean);
  public constructor(...args: any[]) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);

      const value = AsnConvert.parse(this.value, AsnBasicConstraints);
      this.ca = value.cA;
      this.pathLength = value.pathLenConstraint;
    } else {
      const value = new AsnBasicConstraints({
        cA: args[0],
        pathLenConstraint: args[1],
      });
      super(id_ce_basicConstraints, args[2], AsnConvert.serialize(value));

      this.ca = args[0];
      this.pathLength = args[1];
    }
  }
}