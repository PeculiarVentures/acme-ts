import { Crypto } from "@peculiar/webcrypto";
import { cryptoProvider } from "@peculiar/x509";
import { DependencyContainer, Lifecycle, RegistrationOptions } from "tsyringe";
import { AcmeController, diAcmeController } from "./controllers";
import { IServerOptions } from "./services";

import * as data from "@peculiar/acme-data";
import * as types from "./services/types";
import * as services from "./services";
import * as normalizeURL from "normalize-url";
import * as url from "url";
import { DnsChallengeService } from "./services/identifiers";

const BaseAddress = "http://localhost/acme";

function registerEmpty(container: DependencyContainer, token: string, provider: any, options?: RegistrationOptions): void {
  if (!container.isRegistered(token)) {
    container.register(token, provider, options);
  }
}

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

    const serverOptions = {
      ...options,
      baseAddress,
      cryptoProvider: options.cryptoProvider,
      hashAlgorithm: options.hashAlgorithm ?? "SHA-1",
      ordersPageSize: options.ordersPageSize ?? 10,
      expireAuthorizationDays: options.expireAuthorizationDays ?? 3,
      downloadCertificateFormat: options.downloadCertificateFormat ?? "PemCertificateChain",
      debugMode: options.debugMode ?? false,
      levelLogger: options.levelLogger,
    } as IServerOptions;

    if (!container.isRegistered(data.diAccountRepository)) {
      data.DependencyInjection.register(container);
    }
    container.registerInstance(services.diServerOptions, serverOptions);
    container.register(types.diIdentifierService, DnsChallengeService);

    registerEmpty(container, types.diConvertService, services.ConvertService);
    registerEmpty(container, types.diDirectoryService, services.DirectoryService);
    registerEmpty(container, types.diNonceService, services.NonceService);
    registerEmpty(container, types.diAccountService, services.AccountService);
    registerEmpty(container, types.diExternalAccountService, services.ExternalAccountService);
    registerEmpty(container, types.diAuthorizationService, services.AuthorizationService);
    registerEmpty(container, types.diChallengeService, services.ChallengeService);
    registerEmpty(container, types.diOrderService, services.OrderService);
    registerEmpty(container, types.diCertificateService, services.CertificateService, { lifecycle: Lifecycle.Singleton });
    registerEmpty(container, diAcmeController, AcmeController);
  }
}