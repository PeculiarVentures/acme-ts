<h1 align="center">
  @peculiar/acme-data-dynamodb
</h1>

<div align="center">

![NPM License](https://img.shields.io/npm/l/@peculiar/acme-data-dynamodb)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/PeculiarVentures/acme-ts/release.yml?branch=master&label=release)
[![npm version](https://img.shields.io/npm/v/@peculiar/acme-data-dynamodb.svg)](https://www.npmjs.com/package/@peculiar/acme-data-dynamodb)
[![npm downloads](https://img.shields.io/npm/dm/@peculiar/acme-data-dynamodb.svg)](https://www.npmjs.com/package/@peculiar/acme-data-dynamodb)

</div>

DynamoDB data layer for the Automatic Certificate Management Environment (ACME, RFC 8555) server. Part of [acme-ts](https://github.com/PeculiarVentures/acme-ts).

## Installation

```bash
npm install @peculiar/acme-data-dynamodb
```

## Breaking Changes In v2

v2 is ESM-only and requires Node.js `^20.19.0 || >=22.12.0`. CommonJS code can still `require("@peculiar/acme-data-dynamodb")` on these versions; Node.js 22.0–22.11 can't. Move all `@peculiar/acme-*` packages and `@peculiar/jose` to v2 together. See the [full notes](https://github.com/PeculiarVentures/acme-ts#breaking-changes-in-v2).

- **TypeScript compiling to CommonJS:** use `"module": "node20"` or `"nodenext"` (`node16` fails with TS1479). ESM and bundler setups need no changes.
- **Jest in CommonJS mode:** switch to ESM mode or Vitest, or configure an ESM-to-CommonJS transformer and make sure `transformIgnorePatterns` doesn't exclude the `@peculiar/*` packages, `asn1js` and `tsyringe`.
- **Deep imports** (`@peculiar/acme-data-dynamodb/build/...`) are blocked by `exports`; import from `@peculiar/acme-data-dynamodb`.
- **Peer dependencies:** `tsyringe` (`^4.10.0`) and `@peculiar/x509` (`^3.1.0`) are peers, so your app shares one copy of each with the other `@peculiar/acme-*` packages; npm installs peers automatically.
- **dynamoose 4 and AWS SDK v3:** `registerAsync()` takes an AWS SDK v3 `DynamoDBClientConfig` as `client`; pass credentials as `credentials: { accessKeyId, secretAccessKey }`. The table layout and stored items are unchanged.

## Usage

```ts
import "reflect-metadata";
import { DependencyInjection } from "@peculiar/acme-data-dynamodb";
import { container } from "tsyringe";

// Register the repositories in the dependency injection container
await DependencyInjection.registerAsync(container, {
  // AWS SDK v3 DynamoDBClientConfig
  client: {
    region: "us-east-1",
    // endpoint: "http://localhost:8000", // DynamoDB Local
    // credentials: { accessKeyId: "...", secretAccessKey: "..." },
  },
  options: {
    tableName: "ACME", // default
  },
});
```

## Data structure

### Account

```ts
{
  id:                   { "S": String },
  index:                { "S": "acct#" },
  parentId:             { "S": String }, //KeyThumbprint
  createdAt:            { "S": String },
  termsOfServiceAgreed: { "BOOL": Boolean },
  key: {
      "M": {
        key_ops: { "L": [{ "S": String }] },
        ext: { "BOOL": Boolean },
        kty: { "S": String },
        alg: { "S": String },
        e:   { "S": String },
        n:   { "S": String }
        ...others
      }
  },
  contacts: { "L": [{ "S": String }] },
  status: { "S": String }
},
```

### Order

```ts
{
  id:             { "S": String },
  index:          { "S": "order#HashIdentifier#Data" },
  parentId:       { "S": String }, //AccountId
  identifier:     { "S": String },
  expires:        { "S": String },
  authorizations: { "L": [{ "S": String }] },
  status:         { "S": String }
  certificate: { "M": {
                  thumbprint: { "S": String },
                  id: { "S": String },
                  rawData: { "S": String },
                  status: { "S": String }
                }
  },
},
```

### Certificate

```ts
{
  id:       { "S": String }, //CertificateThumbprint
  index:    { "S": "cert#" },
  parentId: { "S": String }, //OrderId
},
```

### Authorization

```ts
{
  id:         { "S": String },
  index:      { "S": "authz#HashIdentifier#Data" },
  parentId:   { "S": String }, //AccountId
  status:     { "S": String }
  expires:    { "S": String },
  orders:     { "L": [{ "S": String }] }, //OrderId[]
  identifier: { "M": {
                  type: { "S": String },
                  value: { "S": String }
              }
  },
}
```

### Challenge

```ts
{
  id:        { "S": String },
  index:     { "S": "challenge#" },
  parentId:  { "S": String }, //AuthorizationId
  validated: { "S": String },
  errorId:   { "S": String },
  type:      { "S": String },
  status:    { "S": String },
  token:     { "S": String }
}
```
