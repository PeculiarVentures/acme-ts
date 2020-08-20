import express = require("express");
import { Request, Response } from 'express';
import { container } from "tsyringe";
import { diDirectoryController, DirectoryController } from "../controllers";
import { AccountService, diAccountService, diAcmeController, AcmeController } from "@peculiar/acme-server";

export const router = express.Router({
  strict: true
});
router.get('/', (req: Request, res: Response) => {
  container.resolve<AcmeController>(diAcmeController);
  container.resolve<DirectoryController>(diDirectoryController).get(req, res);
});