import * as http from "http";
import express from "express";
import { diLogger, ConsoleLogger } from "@peculiar/acme-core";
import * as x509 from "@peculiar/x509";
import { AcmeExpress } from "@peculiar/acme-express";
import { DependencyInjection as diData } from "@peculiar/acme-data-memory";
import { diEndpointService } from "@peculiar/acme-server";
import { Crypto } from "@peculiar/webcrypto";
import { container } from "tsyringe";
import { MemoryEndpointService } from "./services";
import { ITestServerOptions2 } from "./services/options";

let server: http.Server | null = null;
export async function run(port: number) {
  stop();
  const app = express();

  const crypto = new Crypto();
  x509.cryptoProvider.set(crypto);

  // before AcmeExpress because this logger need for logs in setup moment
  container.register(diLogger, ConsoleLogger);

  AcmeExpress.register(app, {
    baseAddress: `http://localhost:${port}/acme`,
    levelLogger: "info",
    cryptoProvider: crypto,
    debugMode: true,
    formattedResponse: true,
  } as Partial<ITestServerOptions2>);

  diData.register(container);
  const memoryEndpoint = await MemoryEndpointService.create([
    "CN=Memory Root CA, O=Test",
    "CN=Memory CA, O=Test",
  ]);
  container.register(diEndpointService, { useValue: memoryEndpoint });

  await new Promise<void>((resolve, reject) => {
    try {
      server = app.listen(port, () => {
        console.log(`Server is running`);
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function stop() {
  if (server) {
    server.close();
    server = null;
  }
}
