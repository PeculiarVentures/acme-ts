import * as assert from "assert";
import * as fetch from "node-fetch";
import { ApiClient } from "@peculiar/acme-client";
import { ApiResponse } from "packages/client/src/base";
import * as protocol from "@peculiar/acme-protocol";
import { Crypto } from "@peculiar/webcrypto";
import { cryptoProvider } from "@peculiar/acme-core";

export function checkHeaders(res: ApiResponse<any>) {
  assert.equal(!!res.headers.link, true);
  assert.equal(!!res.headers.location, true);
}
export function checkResAccount(res: any, status: number) {
  assert.equal(res.status, status);
}

export async function preparation(newAccount?: boolean) {
  let account: protocol.Account | undefined;

  const crypto = new Crypto();
  cryptoProvider.set(crypto);

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
  await client.initialize();

  if (newAccount) {
    const res = await client.createAccount({
      contact: ["mailto:microshine@mail.ru"],
      termsOfServiceAgreed: true,
    });
    account = res.content;
  }

  return {
    client,
    account,
  };
}