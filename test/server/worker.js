/* eslint-disable */
require("reflect-metadata");
const { Crypto } = require("@peculiar/webcrypto");
const x509 = require("@peculiar/x509");
const express = require("express");
const { Convert } = require("pvtsutils");
const tsConfigPaths = require("tsconfig-paths");
const tsNode = require("ts-node");
const { container, Lifecycle } = require("tsyringe");
const { isMainThread, parentPort, workerData } = require("worker_threads");

tsConfigPaths.register();
tsNode.register();

const { AcmeExpress } = require("@peculiar/acme-express");
const acmeServer = require("@peculiar/acme-server");
const acmeData = require("@peculiar/acme-data-memory");
const { MemoryEndpointService } = require("@peculiar/acme-test-server/src/services/memory_endpoint");

if (!isMainThread) {

  const app = express();
  const crypto = new Crypto();
  AcmeExpress.register(app, {
    baseAddress: workerData.url,
    loggerLevel: "error",
    cryptoProvider: crypto,
    debugMode: true,
  });
  acmeData.DependencyInjection.register(container);
  container.register(acmeServer.diEndpointService, MemoryEndpointService, { lifecycle: Lifecycle.Singleton });

  app.listen(4000, () => {
    parentPort.postMessage(""); // Send message to the main process
  });
}


process
  .on("uncaughtException", (e) => {
    console.error(e);
    process.exit(1);
  })
  .on("unhandledRejection", (e) => {
    console.error(e);
    process.exit(1);
  });
