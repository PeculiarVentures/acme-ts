<h1 align="center">
  @peculiar/acme-server
</h1>

<div align="center">

![NPM License](https://img.shields.io/npm/l/@peculiar/acme-server)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/PeculiarVentures/acme-ts/release.yml?branch=master&label=release)
[![npm version](https://img.shields.io/npm/v/@peculiar/acme-server.svg)](https://www.npmjs.com/package/@peculiar/acme-server)
[![npm downloads](https://img.shields.io/npm/dm/@peculiar/acme-server.svg)](https://www.npmjs.com/package/@peculiar/acme-server)

</div>

Server services and controller of the Automatic Certificate Management Environment (ACME, RFC 8555), independent of the HTTP framework. Part of [acme-ts](https://github.com/PeculiarVentures/acme-ts).

## Installation

```bash
npm install @peculiar/acme-server
```

## Breaking Changes In v2

v2 is ESM-only and requires Node.js `^20.19.0 || >=22.12.0`. CommonJS code can still `require("@peculiar/acme-server")` on these versions; Node.js 22.0–22.11 can't. Move all `@peculiar/acme-*` packages and `@peculiar/jose` to v2 together. See the [full notes](https://github.com/PeculiarVentures/acme-ts#breaking-changes-in-v2).

- **TypeScript compiling to CommonJS:** use `"module": "node20"` or `"nodenext"` (`node16` fails with TS1479). ESM and bundler setups need no changes.
- **Jest in CommonJS mode:** switch to ESM mode or Vitest, or configure an ESM-to-CommonJS transformer and make sure `transformIgnorePatterns` doesn't exclude the `@peculiar/*` packages, `asn1js` and `tsyringe`.
- **Deep imports** (`@peculiar/acme-server/build/...`) are blocked by `exports`; import from `@peculiar/acme-server`.
- **Peer dependencies:** `tsyringe` (`^4.10.0`), `@peculiar/x509` (`^3.1.0`) and `@peculiar/asn1-schema` (`^3.0.0`) are peers, so your app shares one copy of each with the other `@peculiar/acme-*` packages; npm installs peers automatically.
- **Reflect polyfill:** import `reflect-metadata` (or another Reflect polyfill) once, before any other import. `@peculiar/x509` 1.x used to load it.
- **Default crypto provider** is `globalThis.crypto` instead of `@peculiar/webcrypto`; pass `cryptoProvider` if you create keys with another implementation.
- **Strict base64url:** padded values are rejected, and `finalize` only accepts a base64url CSR (`badCSR` otherwise).
