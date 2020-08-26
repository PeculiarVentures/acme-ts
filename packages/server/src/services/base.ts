import { MalformedError, ILogger, Level, Logger } from "@peculiar/acme-core";
import { inject } from "tsyringe";

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
}

export class BaseService {

  public constructor(
    public options: IServerOptions,
    @inject(Logger) protected logger: ILogger,
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
}
