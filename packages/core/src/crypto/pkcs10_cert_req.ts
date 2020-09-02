import { CertificationRequest } from "@peculiar/asn1-csr";
import { id_sha1WithRSAEncryption, id_sha256WithRSAEncryption, id_sha384WithRSAEncryption, id_sha512WithRSAEncryption } from "@peculiar/asn1-rsa";
import { id_ecdsaWithSHA1, id_ecdsaWithSHA256, id_ecdsaWithSHA384, id_ecdsaWithSHA512 } from "@peculiar/asn1-ecc";
import { AsnConvert } from "@peculiar/asn1-schema";
import { id_pkcs9_at_extensionRequest } from "@peculiar/asn1-pkcs9";
import { AlgorithmIdentifier, Extensions } from "@peculiar/asn1-x509";
import { Name } from "./name";
import { cryptoProvider } from "./provider";
import { HashedAlgorithm } from "./types";
import { BufferSourceConverter } from "pvtsutils";
import { AsnData } from "./asn_data";
import { Attribute } from "./attribute";
import { Extension } from "./extension";
import { PublicKey } from "./public_key";

export class Pkcs10CertificateRequest extends AsnData<CertificationRequest> {

  private tbs!: ArrayBuffer;
  public subject!: string;
  public signatureAlgorithm!: HashedAlgorithm;
  public signature!: ArrayBuffer;
  public publicKey!: PublicKey;
  public attributes!: Attribute[];
  public extensions!: Extension[];

  public constructor(raw: BufferSource);
  public constructor(asn: CertificationRequest);
  public constructor(param: BufferSource | CertificationRequest) {
    if (BufferSourceConverter.isBufferSource(param)) {
      super(param, CertificationRequest);
    } else {
      super(param);
    }
  }

  protected onInit(asn: CertificationRequest): void {
    this.tbs = AsnConvert.serialize(asn.certificationRequestInfo);
    this.publicKey = new PublicKey(asn.certificationRequestInfo.subjectPKInfo);
    this.signatureAlgorithm = this.getSignatureAlgorithm(asn.signatureAlgorithm);
    this.signature = asn.signature;

    this.attributes = asn.certificationRequestInfo.attributes
      .map(o => new Attribute(AsnConvert.serialize(o)));
    const extensions = this.getAttribute(id_pkcs9_at_extensionRequest)?.values[0];
    this.extensions = [];
    if (extensions) {
      this.extensions = AsnConvert.parse(extensions, Extensions)
        .map(o => new Extension(AsnConvert.serialize(o)));
    }
    this.subject = new Name(asn.certificationRequestInfo.subject).toString();
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

  public getSignatureAlgorithm(asn: AlgorithmIdentifier): HashedAlgorithm {
    switch (asn.algorithm) {
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
        throw new Error(`Unsupported algorithm identifier '${asn.algorithm}'`);
    }
  }

  public async verify(crypto = cryptoProvider.get()) {
    const algorithm = { ...this.publicKey.algorithm, ...this.signatureAlgorithm };
    const publicKey = await this.publicKey.export(algorithm, ["verify"], crypto);
    const ok = await crypto.subtle.verify(this.signatureAlgorithm, publicKey, this.signature, this.tbs);
    return ok;
  }

}