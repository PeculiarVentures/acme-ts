import { AsnConvert } from "@peculiar/asn1-schema";
import { Certificate, AlgorithmIdentifier } from "@peculiar/asn1-x509";
import { id_sha1WithRSAEncryption, id_sha256WithRSAEncryption, id_sha384WithRSAEncryption, id_sha512WithRSAEncryption } from "@peculiar/asn1-rsa";
import { id_ecdsaWithSHA1, id_ecdsaWithSHA256, id_ecdsaWithSHA384, id_ecdsaWithSHA512 } from "@peculiar/asn1-ecc";
import { Convert } from "pvtsutils";
import { HashedAlgorithm } from "./types";
import { cryptoProvider } from "./provider";
import { Name } from "./name";
import { Extension } from "./extension";
import { AsnData } from "./asn_data";

export class X509Certificate extends AsnData<Certificate> {
  public readonly serialNumber: string;
  public readonly subject: string;
  public readonly issuer: string;
  public readonly notBefore: Date;
  public readonly notAfter: Date;
  public readonly signatureAlgorithm: HashedAlgorithm;
  public readonly extensions: Extension[] = [];

  public constructor(raw: BufferSource) {
    super(raw, Certificate);

    const tbs = this.asn.tbsCertificate;
    this.serialNumber = Convert.ToHex(tbs.serialNumber);
    this.subject = new Name(tbs.subject).toString();
    this.issuer = new Name(tbs.issuer).toString();
    this.signatureAlgorithm = this.getSignatureAlgorithm();
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
    if (tbs.extensions) {
      this.extensions = tbs.extensions.map(o => new Extension(AsnConvert.serialize(o)));
    }
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

  public async getPublicKey(crypto?: Crypto): Promise<CryptoKey>;
  public async getPublicKey(algorithm: Algorithm, keyUsages: KeyUsage[], crypto?: Crypto): Promise<CryptoKey>;
  public async getPublicKey(...args: any[]) {
    let algorithm: Algorithm = this.getSignatureAlgorithm();
    let keyUsages: KeyUsage[] = ["verify"];
    let crypto = cryptoProvider.get();
    if (args.length > 1) {
      // alg, usages, crypto?
      algorithm = args[0] || algorithm;
      keyUsages = args[1] || keyUsages;
      crypto = args[2] || crypto;
    } else {
      // crypto?
      crypto = args[0] || crypto;
    }

    const spki = AsnConvert.serialize(this.asn.tbsCertificate.subjectPublicKeyInfo);
    return crypto.subtle.importKey("spki", spki, algorithm as any, true, keyUsages);
  }

  public getSignatureAlgorithm(): HashedAlgorithm {
    const signatureAlgorithm = this.asn.signatureAlgorithm;
    switch (signatureAlgorithm.algorithm) {
      case id_sha1WithRSAEncryption:
        return { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-1" } };
      case id_sha256WithRSAEncryption:
        return { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } };
      case id_sha384WithRSAEncryption:
        return { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-384" } };
      case id_sha512WithRSAEncryption:
        return { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } };
      case id_ecdsaWithSHA1:
        return { name: "ECDSA", hash: { name: "SHA-1" } };
      case id_ecdsaWithSHA256:
        return { name: "ECDSA", hash: { name: "SHA-256" } };
      case id_ecdsaWithSHA384:
        return { name: "ECDSA", hash: { name: "SHA-384" } };
      case id_ecdsaWithSHA512:
        return { name: "ECDSA", hash: { name: "SHA-512" } };
      default:
        throw new Error(`Unsupported algorithm identifier '${signatureAlgorithm}'`);
    }
  }

  public setSignatureAlgorithm(algorithm: HashedAlgorithm) {
    const algName = algorithm.name.toLowerCase();
    const hashName = algorithm.hash.name.toLowerCase();
    switch (algName) {
      case "rsassa-pkcs1-v1_5":
        switch (hashName) {
          case "sha-1":
            this.asn.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_sha1WithRSAEncryption,
              parameters: null,
            });
            break;
          case "sha-256":
            this.asn.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_sha256WithRSAEncryption,
              parameters: null,
            });
            break;
          case "sha-384":
            this.asn.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_sha384WithRSAEncryption,
              parameters: null,
            });
            break;
          case "sha-512":
            this.asn.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_sha512WithRSAEncryption,
              parameters: null,
            });
            break;
        }
        break;
      case "ecdsa":
        switch (hashName) {
          case "sha-1":
            this.asn.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_ecdsaWithSHA1,
              parameters: null,
            });
            break;
          case "sha-256":
            this.asn.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_ecdsaWithSHA256,
              parameters: null,
            });
            break;
          case "sha-384":
            this.asn.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_ecdsaWithSHA384,
              parameters: null,
            });
            break;
          case "sha-512":
            this.asn.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_ecdsaWithSHA512,
              parameters: null,
            });
            break;
        }
        break;
      default:
        throw new Error(`Unsupported algorithm`);
    }
  }

  public async verify(date = new Date(), crypto = cryptoProvider.get()) {
    const tbs = AsnConvert.serialize(this.asn.tbsCertificate);
    const publicKey = await this.getPublicKey();
    const ok = await crypto.subtle.verify(this.signatureAlgorithm as any, publicKey, this.asn.signatureValue, tbs);
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