import { IBaseRepository } from "./base";
import { IOrder, Key } from "../models";
import { QueryParams } from "@peculiar/acme-core";

export interface IOrderList {
  items: IOrder[];
  next?: any;
}

export interface IOrderRepository extends IBaseRepository<IOrder> {
  findByThumbprint(thumbprint: string): Promise<IOrder | null>;
  lastByIdentifier(accountId: Key, identifier: string): Promise<IOrder | null>;
  getList(accountId: Key, page: QueryParams, size: number): Promise<IOrderList>;
}