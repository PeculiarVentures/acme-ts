<h1 align="center">
  acme-ts
</h1>

<div align="center">

![GitHub License](https://img.shields.io/github/license/PeculiarVentures/acme-ts)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/PeculiarVentures/acme-ts/release.yml?branch=master&label=release)
![Coveralls](https://img.shields.io/coverallsCoverage/github/PeculiarVentures/acme-ts)

</div>

Client and server implementations of ACME ([RFC 8555](https://www.rfc-editor.org/rfc/rfc8555)) in TypeScript, for building complete certificate lifecycle management.

## Packages

| Package                                                            | Description                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [`@peculiar/acme-client`](packages/client/README.md)               | ACME client                                                                           |
| [`@peculiar/acme-protocol`](packages/protocol/README.md)           | ACME protocol objects                                                                 |
| [`@peculiar/jose`](packages/jose/README.md)                        | JSON Web Signature (JWS) and JSON Web Key (JWK)                                       |
| [`@peculiar/acme-core`](packages/core/README.md)                   | Errors, HTTP content and logging shared by the other packages                         |
| [`@peculiar/acme-data`](packages/data/README.md)                   | Data model and repository interfaces                                                  |
| [`@peculiar/acme-data-memory`](packages/data-memory/README.md)     | In-memory data layer                                                                  |
| [`@peculiar/acme-data-dynamodb`](packages/data-dynamodb/README.md) | DynamoDB data layer                                                                   |
| [`@peculiar/acme-server`](packages/server/README.md)               | ACME server services and controller                                                   |
| [`@peculiar/acme-express`](packages/server-express/README.md)      | Express middleware for the ACME server                                                |
| [`@peculiar/acme-ra`](packages/server-ra/README.md)                | Express registration authority with External Account Binding and several CA endpoints |

All packages share one version and are released together.

## Breaking Changes In v2

v2 is ESM-only and requires Node.js `^20.19.0 || >=22.12.0` (1.x had no `engines` field). Move all `@peculiar/acme-*` packages and `@peculiar/jose` to v2 together. CommonJS code can still `require()` them on these versions; Node.js 22.0–22.11 can't (`ERR_REQUIRE_ESM`).

- **One ESM build per package:** `build/cjs`, `build/es2015` and `build/types` are replaced by `build/*.js` with `.d.ts` files next to them. Deep imports (`@peculiar/acme-core/build/cjs/...`) are blocked by `exports`; import from the package name.
- **TypeScript compiling to CommonJS:** use `"module": "node20"` or `"nodenext"` (`node16` fails with TS1479). ESM and bundler setups need no changes. You need `experimentalDecorators` only for your own `@injectable()` classes, as before.
- **Jest in CommonJS mode:** switch to ESM mode or Vitest, or configure an ESM-to-CommonJS transformer and make sure `transformIgnorePatterns` doesn't exclude the `@peculiar/*` packages, `asn1js` and `tsyringe`.
- **No browser script bundle:** `@peculiar/acme-client` no longer ships `build/acme.js` (the `acme` global) or the `browser` field, so `<script src="https://unpkg.com/@peculiar/acme-client">` stops working. Bundle the package or import it from [esm.sh](https://esm.sh) as a module, or pin `@peculiar/acme-client@1` for the script.

Package-specific changes:

- **Peer dependencies:** the packages register services into and resolve them from tsyringe's global `container`, the same one your app registers into, so `tsyringe` (`^4.10.0`) is a peer of `-core`, `-data`, `-data-memory`, `-data-dynamodb`, `-server`, `-express` and `-ra`. `@peculiar/x509` (`^3.1.0`) is a peer of `-data-memory`, `-data-dynamodb`, `-server` and `-ra` (they share its `cryptoProvider` and pass its objects), and `@peculiar/asn1-schema` (`^3.0.0`) of `-server` and `-ra`. npm 7+ installs peers automatically, and a conflicting version now fails at install (`ERESOLVE`) instead of at runtime.
- **Reflect polyfill:** tsyringe and `@peculiar/x509` 3 need the Reflect metadata API. `@peculiar/acme-core` (and so `-client`) still loads `reflect-metadata` itself, but server apps must import a polyfill once, before any other import (see [Usage](#usage)). `@peculiar/x509` 1.x used to load it.
- **x509 3, asn1-schema 3 and webcrypto 2:** certificates and keys from `@peculiar/x509` 1/2 can't be passed in. The server's default `cryptoProvider` is now `globalThis.crypto` (Node.js WebCrypto) instead of a new `@peculiar/webcrypto` instance; pass `cryptoProvider` explicitly if you create keys with another WebCrypto implementation (use `@peculiar/webcrypto` 2: next to x509 3, 1.x fails ECDSA signing with `Cannot get schema for 'EcDsaSignature' target`).
- **Strict base64url:** following RFC 7515 and RFC 8555 §6.1, the server and `@peculiar/jose` reject base64url values with `=` padding (JWS segments, the `finalize` CSR, the `revokeCert` certificate), and `finalize` no longer accepts a CSR in PEM, hex or standard Base64; it answers `badCSR`.
- **DynamoDB:** `@peculiar/acme-data-dynamodb` moves from dynamoose 2 and aws-sdk v2 (end-of-life) to dynamoose 4 and AWS SDK v3. `DependencyInjection.registerAsync()` takes an AWS SDK v3 `DynamoDBClientConfig` as `client`, so credentials go in `credentials: { accessKeyId, secretAccessKey }`. The table layout and stored items are unchanged.
- **Dependencies:** `node-fetch` (the client uses the global `fetch`), `pvtsutils` (replaced by `@peculiar/utils` 4) and `tslib` are gone.

## Usage

An ACME server with the in-memory data layer:

```ts
// tsyringe and @peculiar/x509 need the Reflect metadata API: import a polyfill first.
import "reflect-metadata";
import express from "express";
import { container } from "tsyringe";
import { DependencyInjection as dataMemory } from "@peculiar/acme-data-memory";
import { AcmeExpress } from "@peculiar/acme-express";
import { diEndpointService } from "@peculiar/acme-server";

const app = express();
AcmeExpress.register(app, { baseAddress: "http://localhost:4000/acme" });
dataMemory.register(container);
// Register the service that issues certificates (see packages/test-server for an example).
container.register(diEndpointService, MyEndpointService);

app.listen(4000);
```

A client (Node.js has `fetch` and WebCrypto built in):

```ts
import { ApiClient } from "@peculiar/acme-client";

const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
const client = await ApiClient.create(keys, "http://localhost:4000/acme/directory");
await client.newAccount({ contact: ["mailto:admin@example.com"], termsOfServiceAgreed: true });
```

See the package READMEs for more.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In short:

```sh
npm ci
npm run build
npm test
```
