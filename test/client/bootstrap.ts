import assert from "assert";
import { ApiClient, ApiResponse } from "@peculiar/acme-client";
import * as protocol from "@peculiar/acme-protocol";
import { Crypto } from "@peculiar/webcrypto";
import { cryptoProvider } from "@peculiar/x509";
import fetch from "node-fetch";


export function checkHeaders(res: ApiResponse<any>) {
  assert.strictEqual(!!res.headers.link, true);
  assert.strictEqual(!!res.headers.location, true);
}
export function checkResAccount(res: any, status: number) {
  assert.strictEqual(res.status, status);
}

export interface ClientWithoutAccountResult {
  api: ApiClient;
}
export interface ClientWithAccountResult extends ClientWithoutAccountResult {
  account: protocol.Account;
}
export type ClientResult = ClientWithoutAccountResult | ClientWithAccountResult;

export async function createClient(newAccount: true): Promise<ClientWithAccountResult>;
export async function createClient(newAccount?: false): Promise<ClientWithoutAccountResult>;
export async function createClient(newAccount?: boolean): Promise<ClientResult> {
  let account: protocol.Account | undefined;

  const crypto = new Crypto();
  cryptoProvider.set(crypto);

  const alg: RsaHashedKeyGenParams = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };
  const keys = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as Required<CryptoKeyPair>;

  // const client = new ApiClient(keys, "https://acme-staging-v02.api.letsencrypt.org/directory", {
  const client = await ApiClient.create(keys, "https://localhost:5003/directory", {
    fetch: fetch as any,
    crypto,
    // debug: true,
  });

  if (newAccount) {
    const res = await client.newAccount({
      contact: ["mailto:microshine@mail.ru"],
      termsOfServiceAgreed: true,
    });
    account = res.content;
  }

  return {
    api: client,
    account,
  };
}
