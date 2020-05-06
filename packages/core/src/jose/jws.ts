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

  public async sing(algorithm: JsonWebSignatureParams, key: CryptoKey) {
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

}