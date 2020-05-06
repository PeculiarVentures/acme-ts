import { JsonWebSignature } from "@peculiar/acme-core";
import { Crypto } from "@peculiar/webcrypto";

context("jose", () => {

  const crypto = new Crypto();

  context("jws", () => {

    context("sign/verify", () => {

      it("RSASSA-PKCS1-v1_5 SHA256", async () => {
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

        console.log(`${jws.protected}.${jws.payload}.${jws.signature}`);
      });

    });

  });

});