import { CertificationRequest, CertificationRequestInfo } from "@peculiar/asn1-csr";
import { id_ecdsaWithSHA1, id_ecdsaWithSHA256, id_ecdsaWithSHA384, id_ecdsaWithSHA512 } from "@peculiar/asn1-ecc";
import { id_pkcs9_at_extensionRequest } from "@peculiar/asn1-pkcs9";
import { id_sha1WithRSAEncryption, id_sha256WithRSAEncryption, id_sha384WithRSAEncryption, id_sha512WithRSAEncryption } from "@peculiar/asn1-rsa";
import { AsnConvert } from "@peculiar/asn1-schema";
import { Name as AsnName, Extension as AsnExtension, SubjectPublicKeyInfo, Extensions, Attribute  as AsnAttribute } from "@peculiar/asn1-x509";
import { cryptoProvider } from "../crypto/provider";
import { Attribute } from "./attribute";
import { Extension } from "./extension";
import { JsonName, Name } from "./name";
import { Pkcs10CertificateRequest } from "./pkcs10_cert_req";
import { HashedAlgorithm } from "./types";

export type Pkcs10CertificateRequestCreateParamsName = string | JsonName;

export interface Pkcs10CertificateRequestCreateParams {
  name: Pkcs10CertificateRequestCreateParamsName;
  extensions?: Extension[];
  attributes?: Attribute[];
  signingAlgorithm: Algorithm | EcdsaParams;
  keys: CryptoKeyPair;
}

export class Pkcs10CertificateRequestGenerator {

  public static async create(params: Pkcs10CertificateRequestCreateParams, crypto = cryptoProvider.get()) {
    const spki = await crypto.subtle.exportKey("spki", params.keys.publicKey);
    const asnReq = new CertificationRequest({
      certificationRequestInfo: new CertificationRequestInfo({
        subject: AsnConvert.parse(new Name(params.name).toArrayBuffer(), AsnName),
        subjectPKInfo: AsnConvert.parse(spki, SubjectPublicKeyInfo),
      }),
    });

    if (params.attributes) {
      for (const o of params.attributes) {
        asnReq.certificationRequestInfo.attributes.push(AsnConvert.parse(o.rawData, AsnAttribute));
      }
    }

    if (params.extensions && params.extensions.length) {
      const attr = new AsnAttribute({ type: id_pkcs9_at_extensionRequest})
      const extensions = new Extensions();
      for (const o of params.extensions) {
        extensions.push(AsnConvert.parse(o.rawData, AsnExtension));
      }
      attr.values.push(AsnConvert.serialize(extensions));
      asnReq.certificationRequestInfo.attributes.push(attr);
    }

    const signingAlgorithm = { ...params.signingAlgorithm, ...params.keys.privateKey.algorithm } as HashedAlgorithm;
    const algName = signingAlgorithm.name.toLowerCase();
    const hashName = typeof signingAlgorithm.hash === "string" ? signingAlgorithm.hash : signingAlgorithm.hash.name.toLowerCase();
    const asnSpki = asnReq.signatureAlgorithm;
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

    const tbs = AsnConvert.serialize(asnReq.certificationRequestInfo);
    const signature = await crypto.subtle.sign(signingAlgorithm, params.keys.privateKey, tbs);
    asnReq.signature = signature;

    return new Pkcs10CertificateRequest(AsnConvert.serialize(asnReq));
  }

}