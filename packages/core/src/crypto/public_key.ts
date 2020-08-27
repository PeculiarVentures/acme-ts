import { ECParameters, id_ecPublicKey, id_secp256r1, id_secp384r1, id_secp521r1 } from "@peculiar/asn1-ecc";
import { id_rsaEncryption, RSAPublicKey } from "@peculiar/asn1-rsa";
import { AsnConvert } from "@peculiar/asn1-schema";
import { SubjectPublicKeyInfo } from "@peculiar/asn1-x509";
import { BufferSourceConverter } from "pvtsutils";
import { AsnData } from "./asn_data";
import { cryptoProvider } from "./provider";

export class PublicKey extends AsnData<SubjectPublicKeyInfo>{

  public algorithm!: RsaKeyAlgorithm | EcKeyImportParams;

  public async export(crypto?: Crypto): Promise<CryptoKey>;
  public async export(algorithm: Algorithm | EcKeyImportParams, keyUsages: KeyUsage[], crypto?: Crypto): Promise<CryptoKey>;
  public async export(...args: any[]) {
    let crypto: Crypto;
    let keyUsages: KeyUsage[] = ["verify"];
    let algorithm = { hash: "SHA-256", ...this.algorithm };

    if (args.length > 1) {
      // alg, usages, crypto?
      algorithm = args[0] || algorithm;
      keyUsages = args[1] || keyUsages;
      crypto = args[2] || cryptoProvider.get();
    } else {
      // crypto?
      crypto = args[0] || cryptoProvider.get();
    }

    return crypto.subtle.importKey("spki", this.rawData, algorithm, true, keyUsages);
  }

  protected onInit(asn: SubjectPublicKeyInfo) {
    switch (asn.algorithm.algorithm) {
      case id_rsaEncryption:
        {
          const rsaPublicKey = AsnConvert.parse(asn.subjectPublicKey, RSAPublicKey);
          const modulus = BufferSourceConverter.toUint8Array(rsaPublicKey.modulus);
          this.algorithm = {
            name: "RSASSA-PKCS1-v1_5",
            publicExponent: BufferSourceConverter.toUint8Array(rsaPublicKey.publicExponent),
            modulusLength: (!modulus[0] ? modulus.slice(1) : modulus).byteLength << 3,
          };
          break;
        }
      case id_ecPublicKey:
        {
          const eccParamsBuf = asn.algorithm.parameters;
          if (!eccParamsBuf) {
            throw new Error("ECC key algorithm doesn't have required parameters");
          }
          const eccParams = AsnConvert.parse(eccParamsBuf, ECParameters);
          let namedCurve: string;
          switch (eccParams.namedCurve) {
            case id_secp256r1:
              namedCurve = "P-256";
              break;
            case id_secp384r1:
              namedCurve = "P-384";
              break;
            case id_secp521r1:
              namedCurve = "P-521";
              break;
            default:
              throw new Error(`Unsupported ECC named curve '${eccParams.namedCurve}'`);
          }
          this.algorithm = { name: "ECDSA", namedCurve };
          break;
        }
      default:
        throw new Error(`Unsupported algorithm identifier '${asn.algorithm.algorithm}'`);
    }
  }

  public async getThumbprint(crypto?: Crypto): Promise<ArrayBuffer>;
  public async getThumbprint(algorithm: globalThis.AlgorithmIdentifier, crypto?: Crypto): Promise<ArrayBuffer>;
  public async getThumbprint(...args: any[]) {
    let crypto: Crypto;
    let algorithm = "SHA-1";

    if (args.length === 1 && !args[0]?.subtle) {
      // crypto?
      algorithm = args[0] || algorithm;
      crypto = args[1] || cryptoProvider.get();
    } else {
      crypto = args[0] || cryptoProvider.get();
    }
    return await crypto.subtle.digest(algorithm, this.rawData);
  }

}