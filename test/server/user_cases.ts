import { ApiClient } from "@peculiar/acme-client";
import { Crypto } from "@peculiar/webcrypto";
import assert from "assert";
import fetch from "node-fetch";
import { Worker } from "worker_threads";

context("ACME user cases", () => {
  let worker: Worker | null;
  const crypto = new Crypto();
  const url = "http://localhost:4321/acme";
  const alg = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };

  before((done) => {
    worker = new Worker(`${__dirname}/worker.js`, {
      workerData: { url }
    })
      .on("message", () => done())
      .on("error", done);
  });

  after(() => {
    if (worker) {
      worker.terminate();
    }
  });

  it("Create authorization", async () => {
    const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as Required<CryptoKeyPair>;
    const client = await ApiClient.create(keys, `${url}/directory`, {
      crypto,
      fetch: (fetch as any),
    });

    await client.newAccount({});

    const authz = await client.newAuthorization({
      identifier: {
        type: "dns",
        value: "some.domain.com",
      }
    });
    assert.strictEqual(authz.status, 201);
    const authz2 = await client.newAuthorization({
      identifier: {
        type: "dns",
        value: "some.domain.com",
      }
    });
    assert.strictEqual(authz2.status, 200);

    // new order must include new authz
    const order = await client.newOrder({
      identifiers: [
        {
          type: "dns",
          value: "some.domain.com",
        },
      ]
    });
    assert.strictEqual(order.content.authorizations[0], authz.headers.location);
  });

  it("Create two orders with the same identifiers", async () => {
    const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as Required<CryptoKeyPair>;
    const client = await ApiClient.create(keys, `${url}/directory`, {
      crypto,
      fetch: (fetch as any),
    });

    await client.newAccount({
      termsOfServiceAgreed: true
    });

    const order = await client.newOrder({
      identifiers: [
        { type: "dns", value: "some.test.com" }
      ]
    });
    assert.strictEqual(order.status, 201);

    const order2 = await client.newOrder({
      identifiers: [
        { type: "dns", value: "some.test.com" }
      ]
    });
    assert.strictEqual(order2.status, 201);
    assert.notStrictEqual(order2.headers.location, order.headers.location);
  });

});
