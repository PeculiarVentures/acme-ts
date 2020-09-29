import * as assert from "assert";
import { ApiClient } from "@peculiar/acme-client";
import { Pkcs10CertificateRequestGenerator } from "@peculiar/x509";
import { Crypto } from "@peculiar/webcrypto";
import fetch from "node-fetch";

const crypto = new Crypto();

async function main() {
  const alg: RsaHashedKeyGenParams = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };
  const keys = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as CryptoKeyPair;

  const client = new ApiClient(keys, "http://localhost:4000/acme/directory", {
    fetch: fetch as any,
    crypto,
    debug: true,
  });

  // Initialize
  await client.initialize();

  // Create a new account
  await client.newAccount({
    contact: ["mailto:microshine@mail.ru"],
    termsOfServiceAgreed: true,
  });

  // Create an order
  let order = await client.newOrder({
    identifiers: [
      { type: "dns", value: "some.domain.com" },
    ],
  });

  assert.strictEqual(order.content.status, "pending");

  // Authorizations
  for (const link of order.content.authorizations) {
    let authz = await client.getAuthorization(link);

    if (authz.content.status === "pending") {
      const httpChallenge = authz.content.challenges.find(o => o.type === "http-01");
      assert(httpChallenge, `Cannot find http-01 challenge for '${authz.content.identifier.type}:${authz.content.identifier.value}' authorization`);

      console.log(httpChallenge);
      // Get Token and put it to wellknown link of the Server

      // Validate challenge
      const resp = await client.getChallenge(httpChallenge.url, "POST");

      const up = /<([^<>]+)>/.exec(resp.headers.link?.find(o => o.includes(`up"`)) || "")?.[1];
      assert(up, "Cannot get up link from header");

      authz = await client.retryAuthorization(authz);
      assert.strictEqual(authz.content.status, "valid");
    }
  }

  // Generate CSR
  const reqKeys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;
  const req = await Pkcs10CertificateRequestGenerator.create({
    keys: reqKeys,
    name: "CN=some.domain.com, DC=some.domain.com",
    signingAlgorithm: alg,
  }, crypto);

  // Request certificate
  await client.finalize(order.content.finalize, {
    csr: req.toString("base64url"),
  });

  order = await client.retryOrder(order);
  assert.strictEqual(order.content.status, "valid");

  assert(order.content.certificate, "Cannot get certificate URL from the order");
  const certs = await client.getCertificate(order.content.certificate);
  console.log(certs.content);
}

main().catch(e => console.error(e));