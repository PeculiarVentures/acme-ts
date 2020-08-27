/* eslint-disable @typescript-eslint/member-delimiter-style */

import { AsnConvert } from "@peculiar/asn1-schema";
import { BufferSourceConverter } from "pvtsutils";

export abstract class AsnData<T> {
  // protected asn: T;
  public readonly rawData: ArrayBuffer;

  public constructor(raw: BufferSource, type: { new(): T; });
  public constructor(asn: T);
  public constructor(...args: any[]) {
    if (args.length === 1) {
      // asn
      const asn: T = args[0];
      this.rawData = AsnConvert.serialize(asn);
      this.onInit(asn);
    } else {
      // raw, type
      const asn = AsnConvert.parse<T>(args[0], args[1]);
      this.rawData = BufferSourceConverter.toArrayBuffer(args[0]);
      this.onInit(asn);
    }
  }

  protected abstract onInit(asn: T): void;
}