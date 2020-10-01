# `server-ra`

> TODO: description

## Install

```
npm install @peculiar/acme-ra
```

## Usage

```ts
import * as express from "express";
import { cryptoProvider, X509CertificateGenerator } from "@peculiar/x509";
import { Crypto } from "@peculiar/webcrypto";
import { AcmeRa, diEndpointService } from "@peculiar/acme-ra";

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

app.listen(4000, () => {
  console.log(`Server is running`);
});
```
