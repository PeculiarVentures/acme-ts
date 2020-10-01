# `@peculiar/acme-express`

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)

## About
`@peculiar/acme-express` is an Express middleware that can be used to add Automatic Certificate Management Environment (ACME) protocol.

## Installation

```
npm install @peculiar/acme-express
```

## Usage

```js
import * as data from "@peculiar/acme-data-memory";
import { AcmeExpress } from "@peculiar/acme-express";
import * as server from "@peculiar/acme-server";
import { Crypto } from "@peculiar/webcrypto";
import * as express from "express";
import { container } from "tsyringe";

const app = express();

AcmeExpress.register(app, {
    baseAddress: "http://localhost:4000/acme",
    cryptoProvider: crypto,
  });

// Register Data layer
data.DependencyInjection.register(container);
// Register Enrollment layer
container.register(server.diCertificateEnrollmentService, CertificateEnrollmentService);


app.listen(8000, () => { console.log(`Server is running`); });
```
