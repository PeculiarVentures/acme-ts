import { cryptoProvider } from "../crypto";

export class JsonWebKey implements globalThis.JsonWebKey {

  public alg?: string;
  public crv?: string;
  public d?: string;
  public dp?: string;
  public dq?: string;
  public e?: string;
  public ext?: boolean;
  public k?: string;
  public key_ops?: string[];
  public kty?: string;
  public n?: string;
  public oth?: RsaOtherPrimesInfo[];
  public p?: string;
  public q?: string;
  public qi?: string;
  public use?: string;
  public x?: string;
  public y?: string;

  public constructor(params: globalThis.JsonWebKey = {}) {
    Object.assign(this, params);
  }

  public async  exportKey(crypto?: Crypto): Promise<CryptoKey>;
  public async  exportKey(algorithm: Algorithm, keyUsages: KeyUsage[], crypto?: Crypto): Promise<CryptoKey>;
  public async  exportKey(...args: any[]) {
    // defaults
    let algorithm: any;
    let keyUsages: KeyUsage[] = ["verify"];
    let crypto = cryptoProvider.get();

    if (arguments.length < 2) {
      // crypto?
      crypto = args[0] || crypto;
      // get default alg
      switch (this.kty) {
        case "RSA":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
          break;
        case "EC":
          algorithm = { name: "ECDSA", namedCurve: this.crv };
          break;
        case "octet":
          algorithm = { name: "HMAC", hash: "SHA-256" };
          break;
        default:
          throw new Error("Unsupported type of JWK");
      }
    } else {
      // algorithm, keyUsages, crypto?
      algorithm = args[0];
      keyUsages = args[1];
      crypto = args[2] || crypto;
    }

    return await crypto.subtle.importKey("jwk", this, algorithm, true, keyUsages);
  }

}