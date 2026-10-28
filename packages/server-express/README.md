<h1 align="center">
  @peculiar/acme-express
</h1>

<div align="center">

![NPM License](https://img.shields.io/npm/l/@peculiar/acme-express)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/PeculiarVentures/acme-ts/release.yml?branch=master&label=release)
[![npm version](https://img.shields.io/npm/v/@peculiar/acme-express.svg)](https://www.npmjs.com/package/@peculiar/acme-express)
[![npm downloads](https://img.shields.io/npm/dm/@peculiar/acme-express.svg)](https://www.npmjs.com/package/@peculiar/acme-express)

</div>

Express middleware that serves the Automatic Certificate Management Environment (ACME, RFC 8555) protocol. Part of [acme-ts](https://github.com/PeculiarVentures/acme-ts).

## Installation

```bash
npm install @peculiar/acme-express
```

## Breaking Changes In v2

v2 is ESM-only and requires Node.js `^20.19.0 || >=22.12.0`. CommonJS code can still `require("@peculiar/acme-express")` on these versions; Node.js 22.0–22.11 can't. Move all `@peculiar/acme-*` packages and `@peculiar/jose` to v2 together. See the [full notes](https://github.com/PeculiarVentures/acme-ts#breaking-changes-in-v2).

- **TypeScript compiling to CommonJS:** use `"module": "node20"` or `"nodenext"` (`node16` fails with TS1479). ESM and bundler setups need no changes.
- **Jest in CommonJS mode:** switch to ESM mode or Vitest, or configure an ESM-to-CommonJS transformer and make sure `transformIgnorePatterns` doesn't exclude the `@peculiar/*` packages, `asn1js` and `tsyringe`.
- **Deep imports** (`@peculiar/acme-express/build/...`) are blocked by `exports`; import from `@peculiar/acme-express`.
- **Peer dependencies:** `tsyringe` (`^4.10.0`) is a peer, so your app shares one copy with the other `@peculiar/acme-*` packages; npm installs peers automatically.
- **Reflect polyfill:** import `reflect-metadata` (or another Reflect polyfill) once, before any other import. `@peculiar/x509` 1.x used to load it.

## Usage

```ts
import "reflect-metadata";
import express from "express";
import { container } from "tsyringe";
import { DependencyInjection as dataMemory } from "@peculiar/acme-data-memory";
import { AcmeExpress } from "@peculiar/acme-express";
import { diEndpointService } from "@peculiar/acme-server";

const app = express();

AcmeExpress.register(app, {
  baseAddress: "http://localhost:4000/acme",
  // cryptoProvider: globalThis.crypto, // default
});

// Register the data layer
dataMemory.register(container);
// Register the service that issues certificates
container.register(diEndpointService, MyEndpointService);

app.listen(4000, () => {
  console.log("Server is running");
});
```
