# `@peculiar/acme-data-dynamodb`

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![npm version](https://badge.fury.io/js/%40peculiar%2Facme-data-dynamodb.svg)](https://badge.fury.io/js/%40peculiar%2Facme-data-dynamodb)

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)
- [Data structure](#data-structure)
  - [Account](#account)
  - [Order](#order)
  - [Certificate](#certificate)
  - [Authorization](#authorization)
  - [challenge](#challenge)

## About

DynamoDB data module for Automatic Certificate Management Environment (ACME) framework.

## Installation

```
npm install @peculiar/acme-data-dynamodb
```

## Usage

```ts
import * as data from "@peculiar/acme-data-dynamodb";
import { container } from "tsyaringe";

// Register services in dependency injection container
data.DependencyInjection.register(container, {
  accessKeyId: "AWS_ACCESS_KEY_ID",
  secretAccessKey: "AWS_ACCESS_KEY",
  region: "local",
  endpoint: "http://localhost:8000",
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