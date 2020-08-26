import { CertificationRequest } from "@peculiar/asn1-csr";
import { id_sha1WithRSAEncryption, id_sha256WithRSAEncryption, id_sha384WithRSAEncryption, id_sha512WithRSAEncryption } from "@peculiar/asn1-rsa";
import { id_ecdsaWithSHA1, id_ecdsaWithSHA256, id_ecdsaWithSHA384, id_ecdsaWithSHA512 } from "@peculiar/asn1-ecc";
import { AsnConvert } from "@peculiar/asn1-schema";
import { AlgorithmIdentifier, Extensions } from "@peculiar/asn1-x509";
import { Name } from "./name";
import { cryptoProvider } from "./provider";
import { HashedAlgorithm } from "./types";
import { BufferSourceConverter } from "pvtsutils";
import { AsnData } from "./asn_data";
import { Attribute } from "./attribute";
import { Extension } from "./extension";

/**
 * ```
 * pkcs-9 OBJECT IDENTIFIER ::= {iso(1) member-body(2) us(840)
 *                               rsadsi(113549) pkcs(1) 9}
 * ```
 */
const id_pkcs9 = "1.2.840.113549.1.9";
const id_pkcs9_at_extensionRequest = `${id_pkcs9}.14`;

export class Pkcs10CertificateRequest extends AsnData<CertificationRequest> {

  public readonly subject: string;
  public readonly signatureAlgorithm: HashedAlgorithm;
  public readonly rawData: ArrayBuffer;
  public readonly attributes: Attribute[] = [];
  public readonly extensions: Extension[] = [];

  public constructor(raw: BufferSource) {
    super(raw, CertificationRequest);

    this.rawData = BufferSourceConverter.toArrayBuffer(raw);

    this.attributes = this.asn.certificationRequestInfo.attributes
      .map(o => new Attribute(AsnConvert.serialize(o)));
    const extensions = this.getAttribute(id_pkcs9_at_extensionRequest)?.values[0];
    if (extensions) {
      this.extensions = AsnConvert.parse(extensions, Extensions)
        .map(o => new Extension(AsnConvert.serialize(o)));
    }
    this.subject = new Name(this.asn.certificationRequestInfo.subject).toString();
    this.signatureAlgorithm = this.getSignatureAlgorithm();
  }

  public getAttribute(type: string) {
    for (const attr of this.attributes) {
      if (attr.type === type) {
        return attr;
      }
    }
    return null;
  }

  public getAttributes(type: string) {
    return this.attributes.filter(o => o.type === type);
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
    let crypto: Crypto;
    if (args.length > 1) {
      // alg, usages, crypto?
      algorithm = args[0] || algorithm;
      keyUsages = args[1] || keyUsages;
      crypto = args[2] || cryptoProvider.get();
    } else {
      // crypto?
      crypto = args[0] || cryptoProvider.get();
    }

    const spki = AsnConvert.serialize(this.asn.certificationRequestInfo.subjectPKInfo);
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

  public async verify(crypto = cryptoProvider.get()) {
    const algorithm = this.getSignatureAlgorithm();

    const publicKey = await this.getPublicKey(algorithm, ["verify"], crypto);
    const signedData = AsnConvert.serialize(this.asn.certificationRequestInfo);
    const ok = await crypto.subtle.verify(algorithm as any, publicKey, this.asn.signature, signedData);
    return ok;
  }

}