import { Algorithms } from "./algorithms";
import { KeyTypes } from "./key_types";
import { EllipticCurves } from "./elliptic_curves";
import * as pvtsutils from "pvtsutils";

export class JsonWebKey implements globalThis.JsonWebKey {

  public alg?: Algorithms;
  public kty?: KeyTypes;
  public e?: string;
  public n?: string;
  public d?: string;
  public dp?: string;
  public dq?: string;
  public p?: string;
  public q?: string;
  public qi?: string;
  public y?: string;
  public x?: string;
  public crv?: EllipticCurves;
  public k?: string;

  public ext?: boolean;
  public key_ops?: string[];
  public oth?: RsaOtherPrimesInfo[];
  public use?: string;

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  #cryptoProvider: Crypto;

  public constructor(cryptoProvider: Crypto, params: globalThis.JsonWebKey = {}) {
    Object.assign(this, params);

    this.#cryptoProvider = cryptoProvider;
  }

  public async exportKey(crypto?: Crypto): Promise<CryptoKey>;
  public async exportKey(algorithm: Algorithm, keyUsages: KeyUsage[], crypto?: Crypto): Promise<CryptoKey>;
  public async exportKey(...args: any[]) {
    // defaults
    let algorithm: any;
    let keyUsages: KeyUsage[] = ["verify"];
    let crypto = this.#cryptoProvider;

    if (arguments.length < 2) {
      // crypto?
      crypto = args[0] || crypto;
      // get default alg
      switch (this.kty) {
        case KeyTypes.RSA:
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
          break;
        case KeyTypes.EC:
          algorithm = { name: "ECDSA", namedCurve: this.crv };
          break;
        case KeyTypes.OctetSequence:
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

  /**
   * Gets thumbprint of JWK
   * @param alg Default SHA256
   */
  public async getThumbprint(alg: Algorithms = Algorithms.SHA256) {

    // eslint-disable-next-line @typescript-eslint/member-delimiter-style
    const listKeys: { [key: string]: string; } = {};
    if (this.crv) {
      listKeys["crv"] = this.crv.toString();
    }
    if (this.e) {
      listKeys["e"] = this.e;
    }
    if (this.k) {
      listKeys["k"] = this.k;
    }
    if (this.kty) {
      listKeys["kty"] = this.kty.toString();
    }
    if (this.n) {
      listKeys["n"] = this.n;
    }
    if (this.x) {
      listKeys["x"] = this.x;
    }
    if (this.y) {
      listKeys["y"] = this.y;
    }
    const json = JSON.stringify(listKeys);

    switch (alg) {
      case Algorithms.SHA256:
        return pvtsutils.Convert.ToHex(await this.digest(json, "SHA-256"));
      case Algorithms.SHA1:
        return pvtsutils.Convert.ToHex(await this.digest(json, "SHA-1"));
      default:
        throw new Error(`Unsupported algorithm: ${alg}`);
    }
  }

  public async digest(json: string, alg: string) {
    const hash = await this.#cryptoProvider.subtle.digest(
      {
        name: alg,
      },
      pvtsutils.BufferSourceConverter.toUint8Array(pvtsutils.Convert.FromUtf8String(json))
    );
    return hash;
  }

  public async getPublicKey() {
    if (this.kty === KeyTypes.EC) {
      return this.getEcdsaPublicKey();
    }
    else if (this.kty === KeyTypes.RSA) {
      return this.getRsaPublicKey();
    }
    throw new Error(`Unsupported type ${this.kty}`);
  }

  public async getEcdsaPublicKey() {
    const alg = {
      name: "ECDSA",
      namedCurve: this.crv,
    };
    return await this.#cryptoProvider.subtle.importKey("jwk", this, alg, true, ["verify"]);
  }

  public async getRsaPublicKey() {
    const alg = {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    };
    return await this.#cryptoProvider.subtle.importKey("jwk", this, alg, true, ["verify"]);
  }
}

