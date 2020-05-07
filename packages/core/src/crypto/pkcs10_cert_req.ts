import { CertificationRequest } from "@peculiar/asn1-csr";
import { id_sha1WithRSAEncryption, id_sha256WithRSAEncryption, id_sha384WithRSAEncryption, id_sha512WithRSAEncryption } from "@peculiar/asn1-rsa";
import { id_ecdsaWithSHA1, id_ecdsaWithSHA256, id_ecdsaWithSHA384, id_ecdsaWithSHA512 } from "@peculiar/asn1-ecc";
import { AsnConvert } from "@peculiar/asn1-schema";
import { AlgorithmIdentifier } from "@peculiar/asn1-x509";
import { Name } from "./name";

export interface HashedAlgorithm extends Algorithm {
  hash: Algorithm;
}

export class Pkcs10CertificateRequest {

  private csr: CertificationRequest;

  public subject = "";
  public signatureAlgorithm: HashedAlgorithm;

  public constructor(raw: BufferSource) {
    this.csr = AsnConvert.parse(raw, CertificationRequest);

    this.subject = new Name(this.csr.certificationRequestInfo.subject).toString();
    this.signatureAlgorithm = this.getSignatureAlgorithm();
  }

  public async getPublicKey(crypto: Crypto, algorithm?: Algorithm, keyUsages?: KeyUsage[]) {
    if (!algorithm) {
      algorithm = this.getSignatureAlgorithm();
    }
    const spki = AsnConvert.serialize(this.csr.certificationRequestInfo.subjectPKInfo);
    return crypto.subtle.importKey("spki", spki, algorithm as any, true, keyUsages || ["verify"]);
  }

  public getSignatureAlgorithm(): HashedAlgorithm {
    const signatureAlgorithm = this.csr.signatureAlgorithm;
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
            this.csr.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_sha1WithRSAEncryption,
              parameters: null,
            });
            break;
          case "sha-256":
            this.csr.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_sha256WithRSAEncryption,
              parameters: null,
            });
            break;
          case "sha-384":
            this.csr.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_sha384WithRSAEncryption,
              parameters: null,
            });
            break;
          case "sha-512":
            this.csr.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_sha512WithRSAEncryption,
              parameters: null,
            });
            break;
        }
        break;
      case "ecdsa":
        switch (hashName) {
          case "sha-1":
            this.csr.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_ecdsaWithSHA1,
              parameters: null,
            });
            break;
          case "sha-256":
            this.csr.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_ecdsaWithSHA256,
              parameters: null,
            });
            break;
          case "sha-384":
            this.csr.signatureAlgorithm = new AlgorithmIdentifier({
              algorithm: id_ecdsaWithSHA384,
              parameters: null,
            });
            break;
          case "sha-512":
            this.csr.signatureAlgorithm = new AlgorithmIdentifier({
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

  public async verify(crypto: Crypto) {
    const algorithm = this.getSignatureAlgorithm();

    const publicKey = await this.getPublicKey(crypto, algorithm);
    const signedData = AsnConvert.serialize(this.csr.certificationRequestInfo);
    const ok = await crypto.subtle.verify(algorithm as any, publicKey, this.csr.signature, signedData);
    return ok;
  }

}