import { Convert } from "pvtsutils";
import { JsonWebAlgorithmConverter } from "./jwa";
import { JsonWebKey } from "./jwk";

export interface JwsProtectedBase {
  alg?: string;
  kid?: string;
  nonce?: string;
  url?: string;
}
export interface JwsProtectedSetter extends JwsProtectedBase {
  jwk?: globalThis.JsonWebKey;
}

export interface JwsProtectedGetter extends JwsProtectedBase {
  jwk?: JsonWebKey;
}

/**
 * Sign/Verify params for JSON Web Signature
 */
export type JwsParams = Algorithm | RsaPssParams | EcdsaParams;

export interface JwsConstructorParams {
  protected?: JwsProtectedSetter;
  payload?: any;
}

/**
 * JSON Web Signature (JWS).
 * See [RFC7515](https://www.rfc-editor.org/rfc/rfc7515.html)
 */
export class JsonWebSignature {

  public protected = "e30";
  public payload = "";
  public signature = "";

  public constructor(params: JwsConstructorParams = {}, private cryptoProvider?: Crypto) {
    if (params.protected) {
      this.setProtected(params.protected);
    }
    if (params.payload) {
      this.setPayload(params.payload);
    }
  }

  public fromJSON(data: any) {
    Object.assign(this, data);
  }

  public isPayloadEmpty() {
    return !this.payload;
  }

  public isPayloadEmptyObject() {
    return this.payload === "e30";
  }

  public getProtected(crypto?: Crypto) {
    const result = this.read(this.protected) as JwsProtectedGetter;
    if (result.jwk) {
      result.jwk = new JsonWebKey(this.getCryptoProvider(crypto), result.jwk);
    }
    return result;
  }
  public setProtected(data: JwsProtectedSetter) {
    this.protected = this.write(data);
  }

  public getPayload<T = any>(): T {
    return this.read(this.payload);
  }

  public tryGetPayload<T>() {
    try {
      return this.getPayload<T>();
    }
    catch
    {
      return null;
    }
  }

  public setPayload(data: any) {
    this.payload = this.write(data);
  }

  public getSignature() {
    return Convert.FromBase64Url(this.signature);
  }

  public setSignature(data: BufferSource) {
    this.signature = Convert.ToBase64Url(data);
  }

  private read(data: string) {
    const bytes = Convert.FromBase64Url(data);
    const json = Convert.ToUtf8String(bytes);
    return json === ""
      ? ""
      : JSON.parse(json);
  }

  private write(data: any) {
    const json = JSON.stringify(data);
    const bytes = Convert.FromUtf8String(json);
    return Convert.ToBase64Url(bytes);
  }

  public async verify(key?: CryptoKey, crypto?: Crypto) {
    // get alg from protected
    const attrs = this.getProtected();
    if (!attrs.alg) {
      throw new Error("JWS.protected doesn't have required parameter 'alg'");
    }
    const alg = JsonWebAlgorithmConverter.toAlgorithm(attrs.alg);
    if (!alg) {
      throw new Error("Cannot convert JWA to WebCrypto algorithm");
    }

    if (!key) {
      const jwk = await this.getKey(crypto);
      if (!jwk) {
        throw new Error("Cannot get JWK key");
      }
      key = jwk;
    }

    // verify
    const data = Convert.FromUtf8String(this.toStringSign());
    const ok = await this.getCryptoProvider(crypto).subtle.verify(alg as any, key, this.getSignature(), data);
    return ok;
  }

  protected async getKey(crypto?: Crypto) {
    const attrs = this.getProtected();
    if (!attrs.jwk) {
      return null;
    }

    if (!attrs.alg) {
      throw new Error("JWS.protected doesn't have required parameter 'alg'");
    }
    const signingAlg = JsonWebAlgorithmConverter.toAlgorithm(attrs.alg);
    if (!signingAlg) {
      throw new Error("Cannot convert JWA to WebCrypto algorithm");
    }
    const alg: any = { ...signingAlg };
    if (alg.name === "ECDSA") {
      alg.namedCurve = attrs.jwk.crv;
    }

    const key = await this.getCryptoProvider(crypto).subtle.importKey("jwk", attrs.jwk, alg, true, ["verify"]);
    return key;
  }

  public async sign(algorithm: JwsParams, key: CryptoKey, crypto?: Crypto) {
    // set alg to protected
    const attrs = this.getProtected();
    const jwa = JsonWebAlgorithmConverter.fromAlgorithm({ ...algorithm, ...key.algorithm });
    if (!jwa) {
      throw new Error("Cannot convert WebCrypto algorithm to JWA");
    }
    attrs.alg = jwa;
    this.setProtected(attrs);

    // sign
    const data = Convert.FromUtf8String(this.toStringSign());
    const signature = await this.getCryptoProvider(crypto).subtle.sign(algorithm as any, key, data);
    this.setSignature(signature);
  }

  private toStringSign() {
    return `${this.protected}.${this.payload}`;
  }

  public toJSON() {
    const json: any = {};
    if (this.protected) {
      json.protected = this.protected;
    }
    if (this.payload) {
      json.payload = this.payload;
    }
    if (this.signature) {
      json.signature = this.signature;
    }
    return json;
  }

  public parse(data: string) {
    if (data[0] === "{") {
      // JSON
      const json = JSON.parse(data);
      this.protected = json.protected || "";
      this.payload = json.payload || "";
      this.signature = json.signature || "";
    } else {
      // Compact
      const parts = data.split(".");
      this.protected = parts[0] || "";
      this.payload = parts[1] || "";
      this.signature = parts[2] || "";
    }
  }

  public toString(compact = false) {
    if (compact) {
      return `${this.protected}.${this.payload}.${this.signature}`;
    }
    return JSON.stringify(this.toJSON());
  }

  private getCryptoProvider(crypto?: Crypto) {
    if (crypto) {
      return crypto;
    } else if (this.cryptoProvider) {
      return this.cryptoProvider;
    }
    throw new Error("Cannot find Crypto");
  }
}