import { AsnConvert } from "@peculiar/asn1-schema";
import { id_ce_keyUsage, KeyUsage } from "@peculiar/asn1-x509";
import { BufferSourceConverter } from "pvtsutils";
import { Extension } from "../extension";

export enum KeyUsageFlags {
  digitalSignature = 1,
  nonRepudiation = 2,
  keyEncipherment = 4,
  dataEncipherment = 8,
  keyAgreement = 16,
  keyCertSign = 32,
  cRLSign = 64,
  encipherOnly = 128,
  decipherOnly = 256
}

export class KeyUsagesExtension extends Extension {
  public readonly usages: KeyUsageFlags;

  public constructor(raw: BufferSource);
  public constructor(usages: KeyUsageFlags, critical?: boolean);
  public constructor(...args: any[]) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);

      const value = AsnConvert.parse(this.value, KeyUsage);
      this.usages = value.toNumber();
    } else {
      const value = new KeyUsage(args[0]);
      super(id_ce_keyUsage, args[1], AsnConvert.serialize(value));

      this.usages = args[0];
    }
  }
}