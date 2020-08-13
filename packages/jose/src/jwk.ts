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

  public constructor(private cryptoProvider: Crypto, params: globalThis.JsonWebKey = {}) {
    Object.assign(this, params);
  }

  public async exportKey(crypto?: Crypto): Promise<CryptoKey>;
  public async exportKey(algorithm: Algorithm, keyUsages: KeyUsage[], crypto?: Crypto): Promise<CryptoKey>;
  public async exportKey(...args: any[]) {
    // defaults
    let algorithm: any;
    let keyUsages: KeyUsage[] = ["verify"];
    let crypto = this.cryptoProvider;

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
  public getThumbprint(alg: Algorithms = Algorithms.SHA256) {

    const listKeys: { [key: string]: string } = {};
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
        return this.digest(json, "SHA-256");
      case Algorithms.SHA1:
        return this.digest(json, "SHA-1");
      default:
        throw new Error(`Unsupported algorithm: ${alg}`);
    }
  }

  public digest(json: string, alg: string) {
    let result = new Uint8Array;
    this.cryptoProvider.subtle.digest(
      {
        name: alg,
      },
      pvtsutils.BufferSourceConverter.toUint8Array(pvtsutils.Convert.FromUtf8String(json))
    )
      .then(function (hash) {
        result = new Uint8Array(hash);
      });
    return pvtsutils.Convert.ToUtf8String(result);
  }

  public getPublicKey() {
    if (this.kty === KeyTypes.EC) {
      return this.getEcdsaKey();
    }
    else if (this.kty === KeyTypes.RSA) {
      return this.getRsaKey();
    }
    throw new Error(`Unsupported type ${this.kty}`);
  }

  public getEcdsaKey() {
    let result = new CryptoKey();
    this.cryptoProvider.subtle.importKey(
      "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      {   //this is an example jwk key, other key types are Uint8Array objects
        kty: this.kty,
        crv: this.crv,
        x: this.x,
        y: this.y,
        ext: this.ext,
      },
      {   //these are the algorithm options
        name: "ECDSA",
        namedCurve: this.crv, //can be "P-256", "P-384", or "P-521"
      },
      false, //whether the key is extractable (i.e. can be used in exportKey)
      ["verify"] //"verify" for public key import, "sign" for private key imports
    )
      .then(function (publicKey) {
        //returns a publicKey (or privateKey if you are importing a private key)
        result = publicKey;
      });
    return result;
  }

  public getRsaKey() {
    let result = new CryptoKey();
    this.cryptoProvider.subtle.importKey(
      "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      {   //this is an example jwk key, other key types are Uint8Array objects
        kty: this.kty,
        e: this.e,
        n: this.n,
        alg: this.alg,
        ext: this.ext,

      },
      {   //these are the algorithm options
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" }, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      false, //whether the key is extractable (i.e. can be used in exportKey)
      ["verify"] //"verify" for public key import, "sign" for private key imports
    )
      .then(function (publicKey) {
        //returns a publicKey (or privateKey if you are importing a private key)
        result = publicKey;
      });
    return result;
  }
}

