import "@peculiar/acme-protocol";
import "@peculiar/acme-server";

declare module "@peculiar/acme-server" {
  interface IServerOptions {
    defaultProvider?: string;
    version?: string;
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
