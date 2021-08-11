import * as assert from "assert";
import { cryptoProvider } from "@peculiar/x509";
import { Crypto } from "@peculiar/webcrypto";
import { JsonWebSignature } from "@peculiar/jose";

context("jose", () => {

  const crypto = new Crypto();
  cryptoProvider.set(crypto);

  context("jws", () => {

    context("sign/verify", () => {

      it("RSASSA-PKCS1-v1_5 SHA256", async () => {
        // generate keys
        const alg = {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
          publicExponent: new Uint8Array([1, 0, 1]),
          modulusLength: 2048,
        } as RsaHashedKeyGenParams;
        const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;

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
        assert.strictEqual(ok, true);
        assert.deepStrictEqual(jws.getPayload(), {csr: "AQAB"});
      });

      it("RSASSA-PKCS1-v1_5 SHA256", async () => {
        // generate keys
        const alg = {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
          publicExponent: new Uint8Array([1, 0, 1]),
          modulusLength: 2048,
        } as RsaHashedKeyGenParams;
        const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;

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
        assert.strictEqual(ok, true);
        assert.deepStrictEqual(jws.getPayload(), "");
      });

      it("ECDSA SHA384", async () => {
        // generate keys
        const alg = {
          name: "ECDSA",
          hash: "SHA-384",
          namedCurve: "P-384",
        } as EcKeyGenParams;
        const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;

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
        assert.strictEqual(ok, true);
      });

      it("HMAC SHA512", async () => {
        // generate keys
        const alg = {
          name: "HMAC",
          hash: "SHA-512",
          length: 256,
        } as HmacKeyGenParams;
        const key = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKey;

        const jws = new JsonWebSignature({}, crypto);
        jws.setProtected({
          kid: "http://key.id",
          nonce: "nonce_value",
          url: "http://test.url",
        });

        await jws.sign(alg, key);

        jws.parse(jws.toString());

        const ok = await jws.verify(key);
        assert.strictEqual(ok, true);
      });

    });

  });

});
