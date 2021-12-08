import * as express from "express";
import { container } from "tsyringe";
import * as url from "url";
import cors from "cors";

import { diLogger, ILogger } from "@peculiar/acme-core";
import { DependencyInjection as diServer, diServerOptions, IServerOptions } from "@peculiar/acme-server";

import { routers } from "./routes";
import { diControllers, Controllers } from "./controllers";

export * from "./controllers";
export * from "./routes";

export type IAcmeExpressOptions = Partial<IServerOptions>;

class AcmeExpressOptions {
  private logger = container.resolve<ILogger>(diLogger);
  public info(msg: string, ...args: any[]) {
    this.logger.info(msg, ...args);
  }
}

export class AcmeExpress {

  public static register(app: express.Express, options: IAcmeExpressOptions = {}) {
    diServer.register(container, options);

    container.register(diControllers, Controllers);

    const opt = container.resolve<IServerOptions>(diServerOptions);

    app.use(cors({
      methods: "GET, POST, OPTIONS, HEAD",
      allowedHeaders: "Content-Type, Authorization, Cache-Control, Replay-Nonce",
      exposedHeaders: "Location, Link, Replay-Nonce"
    }));

    app.use(express.json({ type: "application/jose+json" }));
    app.use(url.parse(opt.baseAddress).pathname || "/", routers);

    //#region Print options
    const logger = new AcmeExpressOptions();
    const keys = Object.keys(opt);
    keys.forEach(key => logger.info(`${key}: ${(opt as any)[key]}`));
    //#endregion
  }
}
