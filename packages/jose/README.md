# `@peculiar/jose`

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![npm version](https://badge.fury.io/js/%40peculiar%2Facme-jose.svg)](https://badge.fury.io/js/%40peculiar%2Facme-jose)

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)
  - [Browser](#browser)
  - [NodeJS](#nodejs)
- [Examples](#examples)
  - [Create JWS](#create-jws)
  - [VErify JWS](#verify-jws)

## About

`@peculiar/jose` implements Javascript Object Signing and Encryption (jose).

## Installation

```
npm install @peculiar/jose
```
## Usage

### Browser

> TODO: Setup browser compiler and add unpkg link

### NodeJS

```js
import * as jose from "@peculiar/jose";
```

> NOTE: For WebCrypto implementation in NodeJS use third-party modules (eg `@peculiar/webcrypto`).

### Examples

### Create JWS

```js
// Generate ECDSA key pair
const alg = {
  name: "ECDSA",
  hash: "SHA-384",
  namedCurve: "P-384",
};
const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]);

// Create JWS object
const jws = new jose.JsonWebSignature({}, crypto);
jws.setProtected({
  jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
  nonce: "nonce_value",
  url: "http://test.url",
});
jws.setPayload({
  value: "hello world"
});

// Sign
await jws.sign({ ...alg, hash: "SHA-384" }, keys.privateKey);

console.log("Compact:", jws.toString(true));
// Compact: eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTM4NCIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwieCI6IlNNWGxyREotZ1E2QzVoVUlCM0Q4SVBPX21VZlhXUE85aV84RkZOWXFDa0FBNVhlUWtHaXBJUzMwWU1Da21ua3giLCJ5IjoiUk1wMk9xa3duM1FTZEZkYlROX0tmTWxPOWxGVVlIWkZmVXRESmxBRDJMbHIxVTNES1lXSHp0YkVoR3JiRTFadCJ9LCJub25jZSI6Im5vbmNlX3ZhbHVlIiwidXJsIjoiaHR0cDovL3Rlc3QudXJsIiwiYWxnIjoiRVMzODQifQ.eyJ2YWx1ZSI6ImhhbGxvIHdvcmxkIn0.JL8aafh1EdUHg-N2YkBn3BVZTfcXOSlYkGCmcHYtV79AbZB3ZiyJiVjQNYyldlTVKPpH3POTXwsCAyxT-_CFBibpZfaNeg9vfZo3c_EVDje7ckgprp5NPvkQUODOub9k
```

### Verify JWS
```js
const jws = new jose.JsonWebSignature({}, crypto);
jws.parse("eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOi...vfZo3c_EVDje7ckgprp5NPvkQUODOub9k");
const ok = await jws.verify(); // true
```