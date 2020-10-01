# `@peculiar/acme-ra`

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![npm version](https://badge.fury.io/js/%40peculiar%2Facme-ra.svg)](https://badge.fury.io/js/%40peculiar%2Facme-ra)

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)

## About

`@peculiar/acme-ra` is Express middleware withAutomatic Certificate Management Environment (ACME) implementing RFC 8555 protocol that supports External Account Binding using Bearer tokens and multiple Certificate Authority endpoints.

## Installation

```
npm install @peculiar/acme-ra
```

## Usage

```ts
import * as express from "express";
import { cryptoProvider, X509CertificateGenerator } from "@peculiar/x509";
import { Crypto } from "@peculiar/webcrypto";
import { AcmeRa, diEndpointService } from "@peculiar/acme-ra";

const app = express();

const crypto = new Crypto();
cryptoProvider.set(crypto);

AcmeRa.register(app, {
    baseAddress: "http://localhost:4000/acme",
    levelLogger: "info",
    cryptoProvider: crypto,
    debugMode: true,
    caCertificate: caCert,
    extraCertificateStorage: [rootCert, caCert],
    meta: { externalAccountRequired: true },
    defaultEndpoint: "default",
    auth0Domain: "http://domain.auth0.com",
  });

app.listen(8000, () => {
  console.log(`Server is running`);
});
```
