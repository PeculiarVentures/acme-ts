# `@peculiar/acme-client`

- [About](#about)
- [Installation](#installation)
- [Documentation](#documentation)
- [Usage](#usage)
  - [Browser](#browser)
  - [NodeJs](#nodejs)
- [Examples](#examples)
  - [Create an ACME client and get a directory object](#create-an-acme-client-and-get-a-directory-object)
  - [Create a new account](#create-a-new-account)
  - [Enroll certificate](#enroll-certificate)

## About

`@peculiar/acme-client` is an Automatic Certificate Management Environment (ACME) client.

## Installation

```sh
npm install @peculiar/acme-client
```

## Usage

### Browser

Every release of `@peculiar/acme-client` will have new build of `./build/acme.js` for use in the browser. To get access to module classes use `acme` global variable.

> WARN: We recommend hosting and controlling your own copy for security reasons

```html
<script src="https://unpkg.com/@peculiar/acme-client"></script>
```

### NodeJS

```js
import * as acme  from "@peculiar/acme-client";
```

> WARN: Client requires WebCrypto API and Fetch API modules. Use third-party modules to set crypto provider and fetch client in NodeJS (eg `@peculiar/webcrypto`, `node-fetch`).

```js
import { Crypto } from "@peculiar/webcrypto";
import fetch from "node-fetch";

const client = new acme.ApiClient(keys, "https://path/to/acme/directory", {
    crypto,
    fetch,
  });
```

## Examples

### Create an ACME client and get a directory object
```js
const client = await ApiClient.create(keys, "http://localhost:4000/acme/directory", {
  // fetch, // required for NodeJS
  // crypto, // required for NodeJS
});

const directory = await client.getDirectory();
```

### Create a new account

```js
// Generate account keys
const alg = { name: "ECDSA", namedCurve: "P-256" };
const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]);

const account = await client.newAccount({
  contact: ["mailto:some@email.net"],
  termsOfServiceAgreed: true,
});
```

### Enroll certificate

> WARN: That example uses `@peculiar/x509` package for CSR generation

```js
// Create a new order
let order = await client.newOrder({
  identifiers: [
    { type: "dns", value: "some.domain.com" },
  ],
});

for (const link of order.content.authorizations) {
  let authz = await client.getAuthorization(link);

  if (authz.content.status === "pending") {
    const httpChallenge = authz.content.challenges.find(o => o.type === "http-01");
    assert(httpChallenge, `Cannot find http-01 challenge for '${authz.content.identifier.type}:${authz.content.identifier.value}' authorization`);

    console.log(httpChallenge);
    // Get Token and put it to wellknown link of the Server

    // Validate challenge
    const resp = await client.getChallenge(httpChallenge.url, "POST");

    const up = /<([^<>]+)>/.exec(resp.headers.link.find(o => o.includes(`up"`)))[1];
    assert(up, "Cannot get up link from header");

    authz = await client.retryAuthorization(up);
    assert.strictEqual(authz.content.status, "valid");
  }
}

// Generate CSR
const reqKeys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;
const req = await x509.Pkcs10CertificateRequestGenerator.create({
  keys: reqKeys,
  name: "DC=some.domain.com",
  signingAlgorithm: alg,
}, crypto);

// Request certificate
await client.finalize(order.content.finalize, {
  csr: req.toString("base64url"),
});

// Waiting for enrollment
order = await client.retryOrder(order);
assert.strictEqual(order.content.status, "valid");

// Get issued certificate
const certs = await client.getCertificate(order.content.certificate);
console.log(certs.content);
```