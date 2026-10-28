import type { X509Certificate } from "@peculiar/x509";
import type { IServerOptions } from "@peculiar/acme-server";

export interface ITestServerOptions2 extends IServerOptions {
  caCertificate: X509Certificate;
}
