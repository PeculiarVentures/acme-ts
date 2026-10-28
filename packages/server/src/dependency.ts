import { cryptoProvider } from "@peculiar/x509";
import type { DependencyContainer, RegistrationOptions } from "tsyringe";
import { Lifecycle } from "tsyringe";
import { AcmeController, diAcmeController } from "./controllers";
import type { IServerOptions } from "./services";

import * as data from "@peculiar/acme-data";
import * as types from "./services/types";
import * as services from "./services";
import normalizeURL from "normalize-url";
import { URL } from "url";
import { DnsChallengeService } from "./services/identifiers";

const BaseAddress = "http://localhost/acme";

function registerEmpty(container: DependencyContainer, token: string, provider: any, options?: RegistrationOptions): void {
  if (!container.isRegistered(token)) {
    container.register(token, provider, options);
  }
}

export class DependencyInjection {
  public static register(container: DependencyContainer, options: Partial<services.IServerOptions> = {}) {
    options.cryptoProvider ??= globalThis.crypto;
    cryptoProvider.set(options.cryptoProvider);

    //#region baseAddress
    let baseAddress = options.baseAddress;
    if (baseAddress) {
      let urlPath = new URL(baseAddress);
      if (!urlPath.hostname) {
        urlPath = new URL(`http://localhost/${urlPath.pathname}`);
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
      downloadCertificateFormat: options.downloadCertificateFormat ?? "pem",
      debugMode: options.debugMode ?? false,
      loggerLevel: options.loggerLevel || "info",
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
