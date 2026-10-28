<h1 align="center">
  @peculiar/jose
</h1>

<div align="center">

![NPM License](https://img.shields.io/npm/l/@peculiar/jose)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/PeculiarVentures/acme-ts/release.yml?branch=master&label=release)
[![npm version](https://img.shields.io/npm/v/@peculiar/jose.svg)](https://www.npmjs.com/package/@peculiar/jose)
[![npm downloads](https://img.shields.io/npm/dm/@peculiar/jose.svg)](https://www.npmjs.com/package/@peculiar/jose)

</div>

JSON Web Signature (JWS) and JSON Web Key (JWK) for ACME (RFC 7515, RFC 7517), built on WebCrypto. Part of [acme-ts](https://github.com/PeculiarVentures/acme-ts).

## Installation

```bash
npm install @peculiar/jose
```

## Breaking Changes In v2

v2 is ESM-only and requires Node.js `^20.19.0 || >=22.12.0`. CommonJS code can still `require("@peculiar/jose")` on these versions; Node.js 22.0–22.11 can't. Move all `@peculiar/acme-*` packages and `@peculiar/jose` to v2 together. See the [full notes](https://github.com/PeculiarVentures/acme-ts#breaking-changes-in-v2).

- **TypeScript compiling to CommonJS:** use `"module": "node20"` or `"nodenext"` (`node16` fails with TS1479). ESM and bundler setups need no changes.
- **Jest in CommonJS mode:** switch to ESM mode or Vitest, or configure an ESM-to-CommonJS transformer and make sure `transformIgnorePatterns` doesn't exclude the `@peculiar/*` packages, `asn1js` and `tsyringe`.
- **Deep imports** (`@peculiar/jose/build/...`) are blocked by `exports`; import from `@peculiar/jose`.
- **Strict base64url:** JWS segments with `=` padding are rejected (RFC 7515), and `getSignature()` still returns an `ArrayBuffer`.

## Usage

```js
import { JsonWebSignature } from "@peculiar/jose";

// Create and sign a JWS
const alg = { name: "ECDSA", namedCurve: "P-384" };
const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]);

const jws = new JsonWebSignature({}, crypto);
jws.setProtected({
  jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
  nonce: "nonce_value",
  url: "http://test.url",
});
jws.setPayload({ value: "hello world" });
await jws.sign({ ...alg, hash: "SHA-384" }, keys.privateKey);
const compact = jws.toString(true);

// Parse and verify it
const received = new JsonWebSignature({}, crypto);
received.parse(compact);
const ok = await received.verify(); // true
```
