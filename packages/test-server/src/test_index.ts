import express = require("express");
import { Express } from "express";
import { routers } from "./routes";
import { Level, diLogger, ILogger } from "@peculiar/acme-core";
import { container } from "tsyringe";
import { DependencyInjection as diServer, IServerOptions } from "@peculiar/acme-server";
import { DependencyInjection as diData } from "@peculiar/acme-data-memory";
import { Crypto } from "@peculiar/webcrypto";
import { diControllers, Controllers } from "./controllers";
import * as normalizeURL from "normalize-url";

export interface IAcmeExpressOptions {
  baseAddress?: string;
  formattedResponse?: boolean;
  cryptoProvider?: Crypto;
  hashAlgorithm?: string;
  ordersPageSize?: number;
  expireAuthorizationDays?: number;
  downloadCertificateFormat?: "PemCertificateChain" | "PkixCert" | "Pkcs7Mime";
  levelLogger?: Level;
  debugMode?: boolean;
}

const BaseAddress = "http://localhost/acme";

export class AcmeExpress {

  public static register(app: Express, options?: IAcmeExpressOptions) {
    //#region baseAddress
    let baseAddress = options?.baseAddress;
    if (baseAddress) {
      const url = new URL(baseAddress);
      if (!url.hostname) {
        url.hostname = "http://localhost/";
      }
      //todo add normalize-url
      baseAddress = normalizeURL(url.toString());
    } else {
      baseAddress = BaseAddress;
    }
    //#endregion

    //#region cryptoProvider
    let cryptoProvider = options?.cryptoProvider;
    if (!cryptoProvider) {
      cryptoProvider = new Crypto();
    }
    //#endregion

    //#region other options
    let hashAlgorithm = options?.hashAlgorithm;
    if (!hashAlgorithm) {
      hashAlgorithm = "SHA-1";
    }

    let expireAuthorizationDays = options?.expireAuthorizationDays;
    if (!expireAuthorizationDays) {
      expireAuthorizationDays = 3;
    }
    let downloadCertificateFormat = options?.downloadCertificateFormat;
    if (!downloadCertificateFormat) {
      downloadCertificateFormat = "PemCertificateChain";
    }
    let debugMode = options?.debugMode;
    if (!debugMode) {
      debugMode = false;
    }
    let levelLogger = options?.levelLogger;
    if (!levelLogger) {
      levelLogger = "error";
    }
    let ordersPageSize = options?.ordersPageSize;
    if (!ordersPageSize) {
      ordersPageSize = 10;
    }
    //#endregion

    const serverOptions: IServerOptions = {
      baseAddress,
      cryptoProvider,
      hashAlgorithm,
      ordersPageSize,
      expireAuthorizationDays,
      downloadCertificateFormat,
      debugMode,
      levelLogger,
    };

    diServer.register(container, serverOptions);

    diData.register(container);
    container.register(diControllers, Controllers);

    app.use(express.json({ type: "application/jose+json" }));
    app.use('/acme', routers);

    //#region Print options
    const logger = container.resolve<ILogger>(diLogger);
    const keys = Object.keys(serverOptions);
    logger.info("Server options:");
    keys.forEach( key => logger.info(`  ${key}: ${(serverOptions as any)[key]}`));
    //#endregion
  }
}
