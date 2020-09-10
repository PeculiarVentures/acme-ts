import { X509Certificate } from "@peculiar/acme-core";
import { IServerOptions } from "@peculiar/acme-server";

export interface ITestServerOptions2 extends IServerOptions {
  caCertificate: X509Certificate;
}