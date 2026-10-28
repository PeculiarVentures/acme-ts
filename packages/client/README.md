<h1 align="center">
  @peculiar/acme-client
</h1>

<div align="center">

![NPM License](https://img.shields.io/npm/l/@peculiar/acme-client)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/PeculiarVentures/acme-ts/release.yml?branch=master&label=release)
[![npm version](https://img.shields.io/npm/v/@peculiar/acme-client.svg)](https://www.npmjs.com/package/@peculiar/acme-client)
[![npm downloads](https://img.shields.io/npm/dm/@peculiar/acme-client.svg)](https://www.npmjs.com/package/@peculiar/acme-client)

</div>

Client for the Automatic Certificate Management Environment (ACME, RFC 8555). Part of [acme-ts](https://github.com/PeculiarVentures/acme-ts).

## Installation

```bash
npm install @peculiar/acme-client
```

## Breaking Changes In v2

v2 is ESM-only and requires Node.js `^20.19.0 || >=22.12.0`. CommonJS code can still `require("@peculiar/acme-client")` on these versions; Node.js 22.0–22.11 can't. Move all `@peculiar/acme-*` packages and `@peculiar/jose` to v2 together. See the [full notes](https://github.com/PeculiarVentures/acme-ts#breaking-changes-in-v2).

- **TypeScript compiling to CommonJS:** use `"module": "node20"` or `"nodenext"` (`node16` fails with TS1479). ESM and bundler setups need no changes.
- **Jest in CommonJS mode:** switch to ESM mode or Vitest, or configure an ESM-to-CommonJS transformer and make sure `transformIgnorePatterns` doesn't exclude the `@peculiar/*` packages, `asn1js` and `tsyringe`.
- **Deep imports** (`@peculiar/acme-client/build/...`) are blocked by `exports`; import from `@peculiar/acme-client`.
- **No browser script bundle:** `build/acme.js` (the `acme` global) and the `browser` field are removed. Bundle the package or import it from [esm.sh](https://esm.sh) as a module, or pin `@peculiar/acme-client@1` for the script.
- **No `node-fetch` needed:** the client uses the global `fetch` and `crypto` of Node.js 20+ by default.

## Usage

Node.js 20+ and browsers have `fetch` and WebCrypto built in; pass `fetch` and `crypto` options only to use other implementations.

```js
import { ApiClient } from "@peculiar/acme-client";
import * as x509 from "@peculiar/x509";

// Generate account keys
const alg = { name: "ECDSA", namedCurve: "P-256" };
const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]);

// Create a client and an account
const client = await ApiClient.create(keys, "https://acme.example.com/directory");
await client.newAccount({
  contact: ["mailto:admin@example.com"],
  termsOfServiceAgreed: true,
});

// Create an order
let order = await client.newOrder({
  identifiers: [{ type: "dns", value: "some.domain.com" }],
});

for (const link of order.content.authorizations) {
  let authz = await client.getAuthorization(link);
  if (authz.content.status === "pending") {
    const challenge = authz.content.challenges.find((o) => o.type === "http-01");
    // Publish the challenge token on your server, then tell the CA to validate it
    await client.getChallenge(challenge.url, "POST");
    authz = await client.retryAuthorization(link);
  }
}

// Generate a CSR (@peculiar/x509 3) and finalize the order
const reqKeys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]);
const req = await x509.Pkcs10CertificateRequestGenerator.create({
  keys: reqKeys,
  name: "CN=some.domain.com",
  signingAlgorithm: { name: "ECDSA", hash: "SHA-256" },
});
await client.finalize(order.content.finalize, { csr: req.toString("base64url") });

// Wait for the certificate and download it
order = await client.retryOrder(order);
const certs = await client.getCertificate(order.content.certificate);
```
