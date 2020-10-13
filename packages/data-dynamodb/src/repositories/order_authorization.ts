import { diOrderAuthorization, IOrderAuthorizationRepository, Key } from "@peculiar/acme-data";
import { OrderAuthorization } from "../models";
import { BaseRepository } from "./base";

export class OrderAuthorizationRepository extends BaseRepository<OrderAuthorization> implements IOrderAuthorizationRepository {

  protected className = diOrderAuthorization;

  public async add(item: OrderAuthorization) {
    const Model = this.getModel();
    const order = await Model.get(item.orderId.toString());
    //@ts-ignore
    order.authorizations ??= [];
    //@ts-ignore
    order.authorizations.push(item.authorizationId.toString());
    await order.save();

    const authz = await Model.get(item.authorizationId.toString());
    //@ts-ignore
    authz.orders ??= [];
    //@ts-ignore
    authz.orders.push(item.orderId.toString());
    await authz.save();

    return item;
  }

  public async findByOrder(orderId: Key) {
    const Model = this.getModel();
    const order = (await Model.get(orderId.toString())).toJSON();
    if (order.authorizations && order.authorizations.length) {
      const orderAuthz: OrderAuthorization[] = [];
      order.authorizations.forEach((element: any) => {
        orderAuthz.push(new OrderAuthorization({
          orderId,
          authorizationId: element,
        }));
      });
      return orderAuthz;
    }
    return [];
  }

  public async findByAuthorization(authorizationId: Key) {
    const Model = this.getModel();
    const authz = (await Model.get(authorizationId.toString())).toJSON();
    if (authz) {
      return authz.orders.map((o: any) => new OrderAuthorization({
        orderId: o,
        authorizationId,
      }));
    }
    return null;
  }
}
