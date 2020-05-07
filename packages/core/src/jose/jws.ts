import { Convert } from "pvtsutils";
import { JsonWebAlgorithmConverter } from "./jwa";

export interface JsonWebSignatureProtected {
  alg?: string;
  jwk?: JsonWebKey;
  kid?: string;
  nonce?: string;
  url?: string;
}

/**
 * Sign/Verify params for JSON Web Signature
 */
export type JsonWebSignatureParams = Algorithm | RsaPssParams | EcdsaParams;

/**
 * JSON Web Signature (JWS).
 * See [RFC7515](https://www.rfc-editor.org/rfc/rfc7515.html)
 */
export class JsonWebSignature {

  public protected = "e30";
  public payload = "";
  public signature = "";

  public constructor(
    public crypto: Crypto
  ) { }

  public isPayloadEmpty() {
    return !this.payload;
  }

  public isPayloadEmptyObject() {
    return this.payload === "e30";
  }

  public getProtected(): JsonWebSignatureProtected {
    return this.read(this.protected);
  }
  public setProtected(data: JsonWebSignatureProtected) {
    this.protected = this.write(data);
  }

  public getPayload() {
    return this.read(this.payload);
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

  public async verify(key: CryptoKey) {
    // get alg from protected
    const attrs = this.getProtected();
    if (!attrs.alg) {
      throw new Error("JWS.protected doesn't have required parameter 'alg'");
    }
    const alg = JsonWebAlgorithmConverter.toAlgorithm(attrs.alg);
    if (!alg) {
      throw new Error("Cannot convert JWA to WebCrypto algorithm");
    }

    // verify
    const data = Convert.FromUtf8String(this.toStringSign());
    const ok = await this.crypto.subtle.verify(alg as any, key, this.getSignature(), data);
    return ok;
  }

  public async sign(algorithm: JsonWebSignatureParams, key: CryptoKey) {
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
    const signature = await this.crypto.subtle.sign(algorithm as any, key, data);
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

}