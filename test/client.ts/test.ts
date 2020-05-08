import * as fetch from "node-fetch";
import { Crypto } from "@peculiar/webcrypto";
import { cryptoProvider } from "@peculiar/acme-core";
import { ApiClient } from "@peculiar/acme-client";

context.only("client", () => {

  const crypto = new Crypto();
  cryptoProvider.set(crypto);

  it("create user", async () => {
    const alg: RsaHashedKeyGenParams = {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
      publicExponent: new Uint8Array([1, 0, 1]),
      modulusLength: 2048,
    };
    const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]);

    const client = new ApiClient(keys, "https://acme-staging-v02.api.letsencrypt.org/directory", {
      fetch: fetch as any,
    });
    const dir = await client.initialize();
    console.log(dir);
    const account = await client.createAccount({
      contact: ["mailto:microshine@mail.ru"],
      termsOfServiceAgreed: true,
    });
    console.log(account);
  });

}).timeout(5e3);