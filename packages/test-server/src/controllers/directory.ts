import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { diAcmeController, AcmeController } from "@peculiar/acme-server";
import { Request as AcmeRequest } from "@peculiar/acme-core";

export const diDirectoryController = "ACME.Express.Controller";

@injectable()
export class DirectoryController {

  public constructor(
    @inject(diAcmeController) protected acmeController: AcmeController,
  ) { }

  public async get(req: Request<import("express-serve-static-core").ParamsDictionary>, res: Response): Promise<void> {
    const request = new AcmeRequest();
    res.json( await this.acmeController.getDirectory(request));
  }


}