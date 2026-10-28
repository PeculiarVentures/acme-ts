import { cryptoProvider } from "@peculiar/x509";
import { Crypto } from "@peculiar/webcrypto";
import { describe, expect, it } from "vitest";
import { JsonWebSignature } from "./jws";

describe("jose", () => {
  const crypto = new Crypto();
  cryptoProvider.set(crypto);

  describe("jws", () => {
    describe("sign/verify", () => {
      it("RSASSA-PKCS1-v1_5 SHA256", async () => {
        // generate keys
        const alg = {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
          publicExponent: new Uint8Array([1, 0, 1]),
          modulusLength: 2048,
        } as RsaHashedKeyGenParams;
        const keys = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as Required<CryptoKeyPair>;

        const jws = new JsonWebSignature({}, crypto);
        jws.setProtected({
          jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
          nonce: "nonce_value",
          url: "http://test.url",
        });
        jws.setPayload({ csr: "AQAB" });

        await jws.sign(alg, keys.privateKey);

        jws.parse(jws.toString());

        const ok = await jws.verify(keys.publicKey);
        expect(ok).toBe(true);
        expect(jws.getPayload()).toStrictEqual({ csr: "AQAB" });
      });

      it("RSASSA-PKCS1-v1_5 SHA256", async () => {
        // generate keys
        const alg = {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
          publicExponent: new Uint8Array([1, 0, 1]),
          modulusLength: 2048,
        } as RsaHashedKeyGenParams;
        const keys = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as Required<CryptoKeyPair>;

        const jws = new JsonWebSignature({}, crypto);
        jws.setProtected({
          jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
          nonce: "nonce_value",
          url: "http://test.url",
        });
        jws.setPayload("");

        await jws.sign(alg, keys.privateKey);

        jws.parse(jws.toString());

        const ok = await jws.verify(keys.publicKey);
        expect(ok).toBe(true);
        expect(jws.getPayload()).toStrictEqual("");
      });

      it("ECDSA SHA384", async () => {
        // generate keys
        const alg = {
          name: "ECDSA",
          hash: "SHA-384",
          namedCurve: "P-384",
        } as EcKeyGenParams;
        const keys = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as Required<CryptoKeyPair>;

        const jws = new JsonWebSignature({}, crypto);
        jws.setProtected({
          jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
          nonce: "nonce_value",
          url: "http://test.url",
        });
        jws.setPayload({});

        await jws.sign({ ...alg, hash: "SHA-384" }, keys.privateKey);

        jws.parse(jws.toString(true));

        const ok = await jws.verify(keys.publicKey);
        expect(ok).toBe(true);
      });

      it("HMAC SHA512", async () => {
        // generate keys
        const alg = {
          name: "HMAC",
          hash: "SHA-512",
          length: 256,
        } as HmacKeyGenParams;
        const key = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as CryptoKey;

        const jws = new JsonWebSignature({}, crypto);
        jws.setProtected({
          kid: "http://key.id",
          nonce: "nonce_value",
          url: "http://test.url",
        });

        await jws.sign(alg, key);

        jws.parse(jws.toString());

        const ok = await jws.verify(key);
        expect(ok).toBe(true);
      });
    });

    describe("base64url decoding", () => {
      function jwsFrom(json: { protected?: string; payload?: string; signature?: string }) {
        const jws = new JsonWebSignature({}, crypto);
        jws.fromJSON(json);
        return jws;
      }

      it("reads unpadded segments", () => {
        // {"nonce":"n"} and {"a":1}
        const jws = jwsFrom({ protected: "eyJub25jZSI6Im4ifQ", payload: "eyJhIjoxfQ", signature: "AQID" });
        expect(jws.getProtected()).toEqual({ nonce: "n" });
        expect(jws.getPayload()).toEqual({ a: 1 });
        expect(new Uint8Array(jws.getSignature())).toEqual(new Uint8Array([1, 2, 3]));
      });

      it("reads an empty payload (POST-as-GET)", () => {
        const jws = jwsFrom({ protected: "e30", payload: "", signature: "" });
        expect(jws.getPayload()).toBe("");
        expect(jws.getSignature().byteLength).toBe(0);
      });

      it("rejects characters outside the base64url alphabet", () => {
        expect(() => jwsFrom({ payload: "eyJhIjoxfQ+" }).getPayload()).toThrow(TypeError);
        expect(() => jwsFrom({ payload: "eyJh/IjoxfQ" }).getPayload()).toThrow(TypeError);
        expect(() => jwsFrom({ payload: "eyJh?IjoxfQ" }).getPayload()).toThrow(TypeError);
        expect(() => jwsFrom({ signature: "AQ.D" }).getSignature()).toThrow(TypeError);
      });

      it("rejects a segment with an impossible length", () => {
        expect(() => jwsFrom({ signature: "AQIDB" }).getSignature()).toThrow(TypeError);
      });

      it("rejects malformed UTF-8", () => {
        // 0x7b 0xff 0x7d
        expect(() => jwsFrom({ payload: "e_99" }).getPayload()).toThrow(TypeError);
      });
    });
  });
});
