import { X509Certificate } from "@peculiar/x509";

declare module "@peculiar/acme-server" {
  interface IServerOptions {
    caCertificate?: X509Certificate[];
    defaultEndpoint: string;
    defaultProvider: string;
  }
}

declare module "@peculiar/acme-protocol" {
  interface Directory {
    newEab?: string;
  }
  interface DirectoryMetadata {
    authzProviders?: string[];
  }
}
