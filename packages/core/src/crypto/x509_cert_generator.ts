import { id_ecdsaWithSHA1, id_ecdsaWithSHA256, id_ecdsaWithSHA384, id_ecdsaWithSHA512 } from "@peculiar/asn1-ecc";
import { id_sha1WithRSAEncryption, id_sha256WithRSAEncryption, id_sha384WithRSAEncryption, id_sha512WithRSAEncryption } from "@peculiar/asn1-rsa";
import { AsnConvert } from "@peculiar/asn1-schema";
import { Certificate, TBSCertificate, Validity, Name as AsnName, Extension as AsnExtension, SubjectPublicKeyInfo, Extensions } from "@peculiar/asn1-x509";
import { Convert } from "pvtsutils";
import { cryptoProvider } from "../crypto/provider";
import { Extension } from "./extension";
import { JsonName, Name } from "./name";
import { HashedAlgorithm } from "./types";
import { X509Certificate } from "./x509_cert";

export type X509CertificateCreateParamsName = string | JsonName;

export interface X509CertificateCreateParamsBase {
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  extensions?: Extension[];
  signingAlgorithm: Algorithm | EcdsaParams;
}

export interface X509CertificateCreateParams extends X509CertificateCreateParamsBase {
  subject: X509CertificateCreateParamsName;
  issuer: X509CertificateCreateParamsName;
  publicKey: CryptoKey;
  signingKey: CryptoKey;
}

export interface X509CertificateCreateSelfSignedParams extends X509CertificateCreateParamsBase{
  name: X509CertificateCreateParamsName;
  keyPair: CryptoKeyPair;
}

export class X509CertificateGenerator {

  public static async createSelfSigned(params: X509CertificateCreateSelfSignedParams, crypto = cryptoProvider.get()) {
    return this.create({
      serialNumber: params.serialNumber,
      subject: params.name,
      issuer: params.name,
      notBefore: params.notBefore,
      notAfter: params.notAfter,
      publicKey: params.keyPair.publicKey,
      signingKey: params.keyPair.privateKey,
      signingAlgorithm: params.signingAlgorithm,
      extensions: params.extensions,
    }, crypto);
  }

  public static async create(params: X509CertificateCreateParams, crypto = cryptoProvider.get()) {
    const spki = await crypto.subtle.exportKey("spki", params.publicKey);
    const asnX509 = new Certificate({
      tbsCertificate: new TBSCertificate({
        serialNumber: Convert.FromHex(params.serialNumber),
        validity: new Validity({
          notBefore: params.notBefore,
          notAfter: params.notAfter,
        }),
        subject: AsnConvert.parse(new Name(params.subject).toArrayBuffer(), AsnName),
        issuer: AsnConvert.parse(new Name(params.issuer).toArrayBuffer(), AsnName),
        extensions: new Extensions(params.extensions?.map(o => AsnConvert.parse(o.rawData, AsnExtension)) || []),
        subjectPublicKeyInfo: AsnConvert.parse(spki, SubjectPublicKeyInfo),
      }),
    });

    const signingAlgorithm = { ...params.signingAlgorithm, ...params.signingKey.algorithm } as HashedAlgorithm;
    const algName = signingAlgorithm.name.toLowerCase();
    const hashName = typeof signingAlgorithm.hash === "string" ? signingAlgorithm.hash : signingAlgorithm.hash.name.toLowerCase();
    const asnSpki = asnX509.tbsCertificate.signature = asnX509.signatureAlgorithm;
    asnSpki.parameters = null;
    switch (algName) {
      case "rsassa-pkcs1-v1_5":
        switch (hashName) {
          case "sha-1":
            asnSpki.algorithm = id_sha1WithRSAEncryption;
            break;
          case "sha-256":
            asnSpki.algorithm = id_sha256WithRSAEncryption;
            break;
          case "sha-384":
            asnSpki.algorithm = id_sha384WithRSAEncryption;
            break;
          case "sha-512":
            asnSpki.algorithm = id_sha512WithRSAEncryption;
            break;
          default:
            throw new Error(`Unsupported hash algorithm`);
        }
        break;
      case "ecdsa":
        switch (hashName) {
          case "sha-1":
            asnSpki.algorithm = id_ecdsaWithSHA1;
            break;
          case "sha-256":
            asnSpki.algorithm = id_ecdsaWithSHA256;
            break;
          case "sha-384":
            asnSpki.algorithm = id_ecdsaWithSHA384;
            break;
          case "sha-512":
            asnSpki.algorithm = id_ecdsaWithSHA512;
            break;
          default:
            throw new Error(`Unsupported hash algorithm`);
        }
        break;
      default:
        throw new Error(`Unsupported algorithm`);
    }

    const tbs = AsnConvert.serialize(asnX509.tbsCertificate);
    const signature = await crypto.subtle.sign(signingAlgorithm, params.signingKey, tbs);
    asnX509.signatureValue = signature;

    return new X509Certificate(AsnConvert.serialize(asnX509));
  }

}