<h1 align="center">
  @peculiar/acme-protocol
</h1>

<div align="center">

![NPM License](https://img.shields.io/npm/l/@peculiar/acme-protocol)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/PeculiarVentures/acme-ts/release.yml?branch=master&label=release)
[![npm version](https://img.shields.io/npm/v/@peculiar/acme-protocol.svg)](https://www.npmjs.com/package/@peculiar/acme-protocol)
[![npm downloads](https://img.shields.io/npm/dm/@peculiar/acme-protocol.svg)](https://www.npmjs.com/package/@peculiar/acme-protocol)

</div>

Protocol objects of the Automatic Certificate Management Environment (ACME, RFC 8555). Part of [acme-ts](https://github.com/PeculiarVentures/acme-ts).

## Installation

```bash
npm install @peculiar/acme-protocol
```

## Breaking Changes In v2

v2 is ESM-only and requires Node.js `^20.19.0 || >=22.12.0`. CommonJS code can still `require("@peculiar/acme-protocol")` on these versions; Node.js 22.0–22.11 can't. Move all `@peculiar/acme-*` packages and `@peculiar/jose` to v2 together. See the [full notes](https://github.com/PeculiarVentures/acme-ts#breaking-changes-in-v2).

- **TypeScript compiling to CommonJS:** use `"module": "node20"` or `"nodenext"` (`node16` fails with TS1479). ESM and bundler setups need no changes.
- **Jest in CommonJS mode:** switch to ESM mode or Vitest, or configure an ESM-to-CommonJS transformer and make sure `transformIgnorePatterns` doesn't exclude the `@peculiar/*` packages, `asn1js` and `tsyringe`.
- **Deep imports** (`@peculiar/acme-protocol/build/...`) are blocked by `exports`; import from `@peculiar/acme-protocol`.
