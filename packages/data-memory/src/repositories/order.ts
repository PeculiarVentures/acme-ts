import { IOrderRepository, IOrder, IOrderList } from "@peculiar/acme-data";
import { QueryParams } from "@peculiar/acme-core";
import { BaseRepository } from "./base";

export class OrderRepository extends BaseRepository<IOrder> implements IOrderRepository {

  public async findByThumbprint(thumbprint: string) {
    return this.items.find(o => o.certificate && o.certificate === thumbprint) || null;
  }

  public async lastByIdentifier(accountId: number, identifier: string) {
    const items = this.items.filter(o => o.accountId === accountId && o.identifier === identifier);
    return items[items.length - 1] || null;
  }

  public async getList(accountId: number, page: QueryParams, size: number) {
    const list = this.items.filter(o => o.accountId === accountId && o.status !== "invalid");
    const cursor = +(page.cursor?.[0] || 0);
    const items = list.slice(cursor * size, cursor * size + size);
    const orderLIst: IOrderList = {
      items: items,
      next: cursor * size + size < list.length,
    };
    return orderLIst;
  }
}