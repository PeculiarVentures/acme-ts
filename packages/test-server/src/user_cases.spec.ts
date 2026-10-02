import * as http from "http";
import { ApiClient } from "@peculiar/acme-client";
import { DependencyInjection as diData } from "@peculiar/acme-data-memory";
import { AcmeExpress } from "@peculiar/acme-express";
import { diEndpointService } from "@peculiar/acme-server";
import { Crypto } from "@peculiar/webcrypto";
import assert from "assert";
import express from "express";
import fetch from "node-fetch";
import { container, Lifecycle } from "tsyringe";
import { afterAll, beforeAll, describe, it } from "vitest";
import { MemoryEndpointService } from "./services";

describe("ACME user cases", () => {
  let server: http.Server | undefined;
  const crypto = new Crypto();
  const port = 4321;
  const url = `http://localhost:${port}/acme`;
  const alg = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
    publicExponent: new Uint8Array([1, 0, 1]),
    modulusLength: 2048,
  };

  beforeAll(async () => {
    const app = express();
    AcmeExpress.register(app, {
      baseAddress: url,
      loggerLevel: "error",
      cryptoProvider: crypto,
      debugMode: true,
    });
    diData.register(container);
    container.register(diEndpointService, MemoryEndpointService, { lifecycle: Lifecycle.Singleton });

    await new Promise<void>((resolve, reject) => {
      server = app.listen(port, resolve).on("error", reject);
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  });

  it("Create authorization", async () => {
    const keys = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as Required<CryptoKeyPair>;
    const client = await ApiClient.create(keys, `${url}/directory`, {
      crypto,
      fetch: fetch as any,
    });

    await client.newAccount({});

    const authz = await client.newAuthorization({
      identifier: {
        type: "dns",
        value: "some.domain.com",
      },
    });
    assert.strictEqual(authz.status, 201);
    const authz2 = await client.newAuthorization({
      identifier: {
        type: "dns",
        value: "some.domain.com",
      },
    });
    assert.strictEqual(authz2.status, 200);

    // new order must include new authz
    const order = await client.newOrder({
      identifiers: [
        {
          type: "dns",
          value: "some.domain.com",
        },
      ],
    });
    assert.strictEqual(order.content.authorizations[0], authz.headers.location);
  });

  it("Create two orders with the same identifiers", async () => {
    const keys = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as Required<CryptoKeyPair>;
    const client = await ApiClient.create(keys, `${url}/directory`, {
      crypto,
      fetch: fetch as any,
    });

    await client.newAccount({
      termsOfServiceAgreed: true,
    });

    const order = await client.newOrder({
      identifiers: [{ type: "dns", value: "some.test.com" }],
    });
    assert.strictEqual(order.status, 201);

    const order2 = await client.newOrder({
      identifiers: [{ type: "dns", value: "some.test.com" }],
    });
    assert.strictEqual(order2.status, 201);
    assert.notStrictEqual(order2.headers.location, order.headers.location);
  });
});
