import * as express from "express";
import { Request, Response } from 'express';
import { container } from "tsyringe";
import { diControllers, Controllers } from "../controllers";

export const routers = express.Router();
routers.get('/directory', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).getDirectory(req, res);
});

routers.head('/new-nonce', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).getNonce(req, res);
});
routers.get('/new-nonce', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).getNonce(req, res);
});

// Account
routers.post('/new-acct', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).newAccount(req, res);
});
routers.post('/acct/:id', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).postAccount(req, res);
});
routers.post('/key-change', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).keyChange(req, res);
});

// Order
routers.post('/new-order', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).createOrder(req, res);
});
routers.post('/order/:id', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).postOrder(req, res, req.params.id);
});
routers.post('/orders', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).postOrders(req, res);
});
routers.post('/finalize/:id', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).finalizeOrder(req, res, req.params.id);
});

routers.post('/authz/:id', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).postAuthorization(req, res, req.params.id);
});
routers.post('/challenge/:id', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).postChallenge(req, res, req.params.id);
});

// Certificate
routers.post('/cert/:id', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).getCertificate(req, res, req.params.id);
});
routers.post('/revoke', (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).revokeCertificate(req, res);
});
routers.post(`/endpoint/:name`, (req: Request, res: Response) => {
  container.resolve<Controllers>(diControllers).getEndpoint(req, res, req.params.name);
});
