import { AsnConvert } from "@peculiar/asn1-schema";
import { Certificate } from "@peculiar/asn1-x509";
import { BufferSourceConverter, Convert } from "pvtsutils";
import { HashedAlgorithm } from "./types";
import { cryptoProvider } from "./provider";
import { Name } from "./name";
import { Extension } from "./extension";
import { AsnData } from "./asn_data";
import { ExtensionFactory } from "./extensions";
import { PublicKey } from "./public_key";
import { container } from "tsyringe";
import { AlgorithmProvider, diAlgorithmProvider } from "./algorithm";

export interface X509CertificateVerifyParams {
  date?: Date;
  publicKey?: CryptoKey;
}

export class X509Certificate extends AsnData<Certificate> {
  private tbs!: ArrayBuffer;
  public serialNumber!: string;
  public subject!: string;
  public issuer!: string;
  public notBefore!: Date;
  public notAfter!: Date;
  public signatureAlgorithm!: HashedAlgorithm;
  public signature!: ArrayBuffer;
  public extensions!: Extension[];
  public privateKey?: CryptoKey;
  public publicKey!: PublicKey;

  public constructor(asn: Certificate);
  public constructor(raw: BufferSource);
  public constructor(param: BufferSource | Certificate) {
    if (BufferSourceConverter.isBufferSource(param)) {
      super(param, Certificate);
    } else {
      super(param);
    }
  }

  protected onInit(asn: Certificate) {
    const tbs = asn.tbsCertificate;
    this.tbs = AsnConvert.serialize(tbs);
    this.serialNumber = Convert.ToHex(tbs.serialNumber);
    this.subject = new Name(tbs.subject).toString();
    this.issuer = new Name(tbs.issuer).toString();
    const algProv = container.resolve<AlgorithmProvider>(diAlgorithmProvider);
    this.signatureAlgorithm = algProv.toWebAlgorithm(asn.signatureAlgorithm) as HashedAlgorithm;
    this.signature = asn.signatureValue;
    const notBefore = tbs.validity.notBefore.utcTime || tbs.validity.notBefore.generalTime;
    if (!notBefore) {
      throw new Error("Cannot get 'notBefore' value");
    }
    this.notBefore = notBefore;
    const notAfter = tbs.validity.notAfter.utcTime || tbs.validity.notAfter.generalTime;
    if (!notAfter) {
      throw new Error("Cannot get 'notAfter' value");
    }
    this.notAfter = notAfter;
    this.extensions = [];
    if (tbs.extensions) {
      this.extensions = tbs.extensions.map(o => ExtensionFactory.create(AsnConvert.serialize(o)));
    }
    this.publicKey = new PublicKey(tbs.subjectPublicKeyInfo);
  }

  public getExtension(type: string) {
    for (const ext of this.extensions) {
      if (ext.type === type) {
        return ext;
      }
    }
    return null;
  }

  public getExtensions(type: string) {
    return this.extensions.filter(o => o.type === type);
  }

  public async verify(params: X509CertificateVerifyParams, crypto = cryptoProvider.get()) {
    const date = params.date || new Date();
    const keyAlgorithm = { ...this.publicKey.algorithm, ...this.signatureAlgorithm };
    const publicKey = params.publicKey || await this.publicKey.export(keyAlgorithm, ["verify"], crypto);

    const ok = await crypto.subtle.verify(this.signatureAlgorithm, publicKey, this.signature, this.tbs);
    const time = date.getTime();
    return ok && this.notBefore.getTime() < time && time < this.notAfter.getTime();
  }

  public async getThumbprint(crypto?: Crypto): Promise<ArrayBuffer>;
  public async getThumbprint(algorithm: globalThis.AlgorithmIdentifier, crypto?: Crypto): Promise<ArrayBuffer>;
  public async getThumbprint(...args: any[]) {
    let crypto = cryptoProvider.get();
    let algorithm = "SHA-1";
    if (args.length === 1 && !args[0]?.subtle) {
      // crypto?
      algorithm = args[0] || algorithm;
      crypto = args[1] || crypto;
    } else {
      crypto = args[0] || crypto;
    }
    return await crypto.subtle.digest(algorithm, this.rawData);
  }
}