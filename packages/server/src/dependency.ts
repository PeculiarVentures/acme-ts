import { Empty } from "@peculiar/acme-data";
import { Crypto } from "@peculiar/webcrypto";
import { cryptoProvider } from "@peculiar/acme-core";
import { DependencyInjection as diData } from "@peculiar/acme-data";
import { DependencyContainer } from "tsyringe";
import { AcmeController, diAcmeController } from "./controllers";
import * as types from "./services/types";
import * as services from "./services";
import { IServerOptions } from "./services";
import * as normalizeURL from "normalize-url";
import * as url from "url";

const BaseAddress = "http://localhost/acme";

export class DependencyInjection {
  public static register(container: DependencyContainer, options: Partial<services.IServerOptions> = {}) {
    options.cryptoProvider ??= new Crypto();
    cryptoProvider.set(options.cryptoProvider);

    //#region baseAddress
    let baseAddress = options.baseAddress;
    if (baseAddress) {
      let urlPath = url.parse(baseAddress);
      if (!urlPath.hostname) {
        urlPath = url.parse(`http://localhost/${urlPath.pathname}`);
      }
      baseAddress = normalizeURL(urlPath.href);
    } else {
      baseAddress = BaseAddress;
    }
    //#endregion

    const serverOptions: IServerOptions = {
      baseAddress,
      cryptoProvider: options.cryptoProvider,
      hashAlgorithm: options.hashAlgorithm ?? "SHA-1",
      ordersPageSize: options.ordersPageSize ?? 10,
      expireAuthorizationDays: options.expireAuthorizationDays ?? 3,
      downloadCertificateFormat: options.downloadCertificateFormat ?? "PemCertificateChain",
      debugMode: options.debugMode ?? false,
      levelLogger: options.levelLogger,
    };

    diData.register(container);

    container
      .registerInstance(services.diServerOptions, serverOptions)
      .register(types.diConvertService, services.ConvertService)
      .register(types.diDirectoryService, services.DirectoryService)
      .register(types.diNonceService, services.NonceService)
      .register(types.diAccountService, services.AccountService)
      .register(types.diExternalAccountService, services.ExternalAccountService)
      .register(types.diAuthorizationService, services.AuthorizationService)
      .register(types.diChallengeService, services.ChallengeService)
      .register(types.diOrderService, services.OrderService)
      .register(types.diCertificateEnrollmentService, Empty)
      .register(diAcmeController, AcmeController);
  }
}