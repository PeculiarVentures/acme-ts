import { MalformedError, ILogger, Level, Logger, diLogger } from "@peculiar/acme-core";
import { inject } from "tsyringe";
import { DirectoryMetadata } from "@peculiar/acme-protocol";

export const diServerOptions = "ACME.ServerOptions";

/**
 * ACME Server options
 *
 * DI: ACME.ServerOptions
 */
export interface IServerOptions {
  baseAddress: string;
  formattedResponse?: boolean;
  cryptoProvider: Crypto;
  hashAlgorithm: string;
  ordersPageSize: number;
  expireAuthorizationDays: number;
  downloadCertificateFormat: "PemCertificateChain" | "PkixCert" | "Pkcs7Mime";
  levelLogger: Level;
  debugMode: boolean;
  meta?: DirectoryMetadata;
}

export class BaseService {

  public constructor(
    @inject(diServerOptions) public options: IServerOptions,
    @inject(diLogger) protected logger: ILogger,
  ) {
    options.ordersPageSize = 5;
    options.hashAlgorithm = "SHA-1";
  }

  public getKeyIdentifier(kid: string) {
    const res = /\/([^/?]+)\??[^/]*$/.exec(kid)?.[1];
    if (!res) {
      throw new MalformedError("Cannot get key identifier from the 'kid'");
    }
    return res;
  }

  protected getCrypto() {
    if (!this.options.cryptoProvider) {
      throw new Error("Cannot get 'cryptoProvider' option");
    }
    return this.options.cryptoProvider;
  }
}
