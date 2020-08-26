import { AsnConvert } from "@peculiar/asn1-schema";
import { id_ce_subjectKeyIdentifier, SubjectKeyIdentifier } from "@peculiar/asn1-x509";
import { BufferSourceConverter, Convert } from "pvtsutils";
import { Extension } from "../extension";
import { cryptoProvider } from "../provider";

export class SubjectKeyIdentifierExtension extends Extension {

  public static async create(publicKey: CryptoKey, critical = false, crypto = cryptoProvider.get()) {
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    const ski = await crypto.subtle.digest("SHA-1", spki);
    return new SubjectKeyIdentifierExtension(Convert.ToHex(ski), critical);
  }

  public readonly identifier: string;

  public constructor(raw: BufferSource);
  public constructor(identifier: string, critical?: boolean);
  public constructor(...args: any[]) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);

      const value = AsnConvert.parse(this.value, SubjectKeyIdentifier);
      this.identifier = Convert.ToHex(value);
    } else {
      const identifier = typeof args[0] === "string"
        ? Convert.FromHex(args[0])
        : args[0];
      const value = new SubjectKeyIdentifier(BufferSourceConverter.toArrayBuffer(identifier));
      super(id_ce_subjectKeyIdentifier, args[1], AsnConvert.serialize(value));

      this.identifier = Convert.ToHex(identifier);
    }
  }
}