import type { IBaseRepository } from "./base";
import type { IOrder, Key } from "../models";
import type { QueryParams } from "@peculiar/acme-core";

export interface IOrderList {
  items: IOrder[];
  next: boolean;
}

export const diOrderRepository = "ACME.OrderRepository";

export interface IOrderRepository extends IBaseRepository<IOrder> {
  findByThumbprint(thumbprint: string): Promise<IOrder | null>;
  lastByIdentifier(accountId: Key, identifier: string): Promise<IOrder | null>;
  getList(accountId: Key, page: QueryParams, size: number): Promise<IOrderList>;
}
