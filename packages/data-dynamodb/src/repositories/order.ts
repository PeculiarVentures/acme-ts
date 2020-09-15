import { IOrderRepository, IOrderList, diOrder, Key } from "@peculiar/acme-data";
import { QueryParams } from "@peculiar/acme-core";
import { BaseRepository } from "./base";
import { Order } from "../models";

export class OrderRepository extends BaseRepository<Order> implements IOrderRepository {
  protected className = diOrder;

  public async update(item: Order) {
    const Model = this.getModel();
    if (item.certificate) {
      const model = new Model({ id: item.certificate.thumbprint, parentId: item.id, index: "cert#" });
      await model.save();
    }
    await item.toDynamo();
    const data = await Model.update({ ...item });
    return this.fromDocument(data);
  }

  public async findByThumbprint(thumbprint: string) {
    const cert = await this.getModel().get(thumbprint);
    return await this.findById(cert.toJSON().parentId);
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