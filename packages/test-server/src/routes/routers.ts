import express = require("express");
import { Request, Response } from 'express';
import { container } from "tsyringe";
import { diControllers, Controllers } from "../controllers";

export const routers = express.Router({
  strict: true
});
routers.get('/directory', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).getDirectory(req, res);
});
routers.head('/new-nonce', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).getNonce(req, res);
});
routers.get('/new-nonce', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).getNonce(req, res);
});