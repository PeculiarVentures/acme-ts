import { MalformedError, ILogger, LoggerLevel, diLogger } from "@peculiar/acme-core";
import { X509Certificate } from "@peculiar/x509";
import { container } from "tsyringe";
import { DirectoryMetadata } from "@peculiar/acme-protocol";

export const diServerOptions = "ACME.ServerOptions";

/**
 * ACME Server options
 *
 * DI: ACME.ServerOptions
 */
export interface IServerOptions {
  /**
   * Default value 'http://localhost/acme'
   */
  baseAddress: string;
  formattedResponse?: boolean;
  /**
   * WebCrypto provider. Default provider is @peculiar/webcrypto
   */
  cryptoProvider?: Crypto;
  hashAlgorithm: string;
  ordersPageSize: number;
  expireAuthorizationDays: number;
  downloadCertificateFormat: "pem" | "pkix" | "pkcs7";
  loggerLevel?: keyof typeof LoggerLevel;
  /**
   * Disables some validations
   * - HTTP-01 challenge validation
   */
  debugMode?: boolean;
  meta?: DirectoryMetadata;
  extraCertificateStorage?: X509Certificate[];
  defaultEndpoint?: string;
}

export class BaseService {

  public logger = container.resolve<ILogger>(diLogger);
  public options = container.resolve<IServerOptions>(diServerOptions);

  public getKeyIdentifier(kid: string) {
    const res = /\/([^/?]+)\??[^/]*$/.exec(kid)?.[1];
    if (!res) {
      throw new MalformedError("Cannot get key identifier from the 'kid'");
    }
    return res;
  }

  protected getCrypto() {
    if (!this.options.cryptoProvider) {
      throw new MalformedError("Cannot get 'cryptoProvider' option");
    }
    return this.options.cryptoProvider;
  }

  /**
   * Returns hash
   * @param obj
   */
  protected async getHash(obj: ArrayBuffer, alg: string = this.options.hashAlgorithm) {
    return this.getCrypto().subtle.digest(alg, obj);
  }
}
