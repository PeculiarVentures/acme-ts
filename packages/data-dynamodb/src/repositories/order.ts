import { IOrderRepository, IOrderList, diOrder, Key, diCertificateRepository, ICertificateRepository } from "@peculiar/acme-data";
import { QueryParams } from "@peculiar/acme-core";
import { container } from "tsyringe";
import { BaseRepository } from "./base";
import { Order } from "../models";

export class OrderRepository extends BaseRepository<Order> implements IOrderRepository {
  protected className = diOrder;

  public async findByThumbprint(thumbprint: string) {
    const certRepo = container.resolve<ICertificateRepository>(diCertificateRepository);

    const cert = await certRepo.findByThumbprint(thumbprint);
    if (!cert || !cert.orderId) {
      return null;
    }

    return await this.findById(cert.orderId);
  }

  public async lastByIdentifier(accountId: string, identifier: string) {
    return await this.findByIndex(accountId, `order#${identifier}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getList(accountId: Key, page: QueryParams, size: number) {
    const items = await this.findAllByIndex(accountId.toString(), `order#`);
    const orderLIst: IOrderList = {
      items: items.filter(o => o.status !== "invalid"),
      next: false,
    };
    return orderLIst;
  }
}
