import { AsnConvert } from "@peculiar/asn1-schema";
import { Certificate, TBSCertificate, Validity, Name as AsnName, Extension as AsnExtension, SubjectPublicKeyInfo, Extensions } from "@peculiar/asn1-x509";
import { Convert } from "pvtsutils";
import { container } from "tsyringe";
import { cryptoProvider } from "../crypto/provider";
import { AlgorithmProvider, diAlgorithmProvider } from "./algorithm";
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

export interface X509CertificateCreateSelfSignedParams extends X509CertificateCreateParamsBase {
  name: X509CertificateCreateParamsName;
  keys: CryptoKeyPair;
}

export class X509CertificateGenerator {

  public static async createSelfSigned(params: X509CertificateCreateSelfSignedParams, crypto = cryptoProvider.get()) {
    return this.create({
      serialNumber: params.serialNumber,
      subject: params.name,
      issuer: params.name,
      notBefore: params.notBefore,
      notAfter: params.notAfter,
      publicKey: params.keys.publicKey,
      signingKey: params.keys.privateKey,
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
    const algProv = container.resolve<AlgorithmProvider>(diAlgorithmProvider);
    asnX509.tbsCertificate.signature = asnX509.signatureAlgorithm = algProv.toAsnAlgorithm(signingAlgorithm);

    const tbs = AsnConvert.serialize(asnX509.tbsCertificate);
    const signature = await crypto.subtle.sign(signingAlgorithm, params.signingKey, tbs);
    asnX509.signatureValue = signature;

    return new X509Certificate(AsnConvert.serialize(asnX509));
  }

}