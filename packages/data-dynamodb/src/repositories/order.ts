import { IOrderRepository, IOrderList, diOrder, Key } from "@peculiar/acme-data";
import { QueryParams } from "@peculiar/acme-core";
import { BaseRepository } from "./base";
import { Order } from "../models";

export class OrderRepository extends BaseRepository<Order> implements IOrderRepository {
  protected className = diOrder;

  public async findByThumbprint(thumbprint: string) {
    const cert = await this.getModel().get(thumbprint);
    return await this.findById(cert.toJSON().orderId);
  }

  public async lastByIdentifier(accountId: string, identifier: string) {
    return await this.findByIndex(accountId, `order#${identifier}`);
  }

  public async getList(accountId: Key, page: QueryParams, size: number) {
    const items = await this.findAllByIndex(accountId.toString(), `order#`);
    const orderLIst: IOrderList = {
      items: items.filter(o => o.status !== "invalid"),
      next: false,
    };
    return orderLIst;
  }
}