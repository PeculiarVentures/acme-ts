import * as assert from "assert";
import { JsonWebSignature } from "@peculiar/acme-core";
import { Crypto } from "@peculiar/webcrypto";

context("jose", () => {

  const crypto = new Crypto();

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
        const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]);

        const jws = new JsonWebSignature(crypto);
        jws.setProtected({
          jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
          nonce: "nonce_value",
          url: "http://test.url",
        })
        jws.setPayload({csr: "AQAB"});

        await jws.sing(alg, keys.privateKey);

        jws.parse(jws.toString());

        const ok = await jws.verify(keys.publicKey);
        assert.equal(ok, true);
      });

      it("HMAC SHA512", async () => {
        // generate keys
        const alg = {
          name: "HMAC",
          hash: "SHA-512",
          length: 256,
        } as HmacKeyGenParams;
        const key = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]);

        const jws = new JsonWebSignature(crypto);
        jws.setProtected({
          kid: "http://key.id",
          nonce: "nonce_value",
          url: "http://test.url",
        })

        await jws.sing(alg, key);

        jws.parse(jws.toString());

        const ok = await jws.verify(key);
        assert.equal(ok, true);
      });

    });

  });

});