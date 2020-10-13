import * as assert from "assert";
import * as fetch from "node-fetch";
import { Crypto } from "@peculiar/webcrypto";
import { cryptoProvider } from "@peculiar/x509";
import { ApiClient } from "@peculiar/acme-client";

context("client", () => {

  const crypto = new Crypto();
  cryptoProvider.set(crypto);

  context("Lets Encrypt", () => {

    it("create user", async () => {
      const alg: RsaHashedKeyGenParams = {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
        publicExponent: new Uint8Array([1, 0, 1]),
        modulusLength: 2048,
      };
      const keys = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as CryptoKeyPair;

      const client = await ApiClient.create(keys, "https://acme-staging-v02.api.letsencrypt.org/directory", {
        fetch: fetch as any,
        crypto,
        debug: false,
      });
      const account = await client.newAccount({
        contact: ["mailto:microshine@mail.ru"],
        termsOfServiceAgreed: true,
      });
      assert.strictEqual(account.status, 201);
    });

  });

}).timeout(5e3);
