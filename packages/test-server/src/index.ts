import * as express from "express";
import { diLogger, ConsoleLogger } from "@peculiar/acme-core";
import * as x509 from "@peculiar/x509";
import { AcmeExpress } from "@peculiar/acme-express";
import { DependencyInjection as diData } from "@peculiar/acme-data-memory";
import { diCertificateService } from "@peculiar/acme-server";
import { Crypto } from "@peculiar/webcrypto";
import { container, Lifecycle } from "tsyringe";
import { CertificateEnrollmentService } from "./services";
import { ITestServerOptions2 } from "./services/options";

async function main() {
  const app = express();

  const crypto = new Crypto();
  x509.cryptoProvider.set(crypto);

  // before AcmeExpress because this logger need for logs in setup moment
  container.register(diLogger, ConsoleLogger);

  // Create new CA cert
  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setUTCFullYear(notAfter.getUTCFullYear() + 1);
  const rootName = "CN=ACME demo root CA, O=PeculiarVentures LLC";
  const caName = "CN=ACME demo CA, O=PeculiarVentures LLC";
  const rootKeys = await crypto.subtle.generateKey(CertificateEnrollmentService.signingAlgorithm, false, ["sign", "verify"]) as CryptoKeyPair;
  const caKeys = await crypto.subtle.generateKey(CertificateEnrollmentService.signingAlgorithm, false, ["sign", "verify"]) as CryptoKeyPair;

  const rootCert = await x509.X509CertificateGenerator.create({
    serialNumber: "01",
    subject: rootName,
    issuer: rootName,
    notBefore,
    notAfter,
    signingAlgorithm: CertificateEnrollmentService.signingAlgorithm,
    publicKey: rootKeys.publicKey,
    signingKey: rootKeys.privateKey,
  });
  rootCert.privateKey = rootKeys.privateKey;
  const caCert = await x509.X509CertificateGenerator.create({
    serialNumber: "01",
    subject: caName,
    issuer: rootName,
    notBefore,
    notAfter,
    signingAlgorithm: CertificateEnrollmentService.signingAlgorithm,
    publicKey: caKeys.publicKey,
    signingKey: rootKeys.privateKey,
  });
  caCert.privateKey = caKeys.privateKey;

  AcmeExpress.register(app, {
    baseAddress: "http://localhost:4000/acme",
    levelLogger: "info",
    cryptoProvider: crypto,
    debugMode: true,
    caCertificate: caCert,
    extraCertificateStorage: [rootCert, caCert],
  } as Partial<ITestServerOptions2>);

  container.register(diCertificateService, CertificateEnrollmentService, { lifecycle: Lifecycle.Singleton });
  diData.register(container);

  app.listen(4000, () => { console.log(`Server is running`); });

}

main().catch(e => console.error(e));