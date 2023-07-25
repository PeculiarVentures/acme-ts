import * as acmeData from "@peculiar/acme-data";
import { container } from "tsyringe";
import { OrderAuthorization } from "../models";
import { BaseRepository } from "./base";

/**
 * Extended Order structure for DynamoDB.
 */
interface IOrderEx extends acmeData.IOrder {
  authorizations?: string[];
}

/**
 * Extended Authorization structure for DynamoDB.
 */
interface IAuthorizationEx extends acmeData.IOrderAuthorization {
  orders?: string[];
}

export class OrderAuthorizationRepository extends BaseRepository<OrderAuthorization> implements acmeData.IOrderAuthorizationRepository {

  protected className = acmeData.diOrderAuthorization;

  public override async add(item: OrderAuthorization): Promise<OrderAuthorization> {
    // Get Order via OrderRepository and add the authorizationId to the order
    const orderRepo = container.resolve<acmeData.IOrderRepository>(acmeData.diOrderRepository);
    const order = await orderRepo.findById(item.orderId) as IOrderEx | null;
    if (!order) {
      throw new Error(`Order not found for id ${item.orderId}`);
    }
    order.authorizations ??= [];
    order.authorizations.push(item.authorizationId.toString());
    await orderRepo.update(order);

    // Get Authorization via AuthorizationRepository and add the orderId to the authorization
    const authzRepo = container.resolve<acmeData.IOrderAuthorizationRepository>(acmeData.diAuthorizationRepository);
    const authz = await authzRepo.findById(item.authorizationId) as IAuthorizationEx | null;
    if (!authz) {
      throw new Error(`Authorization not found for id ${item.authorizationId}`);
    }
    authz.orders ??= [];
    authz.orders.push(item.orderId.toString());
    await authzRepo.update(authz);

    return item;
  }

  public async findByOrder(orderId: acmeData.Key) {
    // Get Order via OrderRepository and find requested order
    const orderRepo = container.resolve<acmeData.IOrderRepository>(acmeData.diOrderRepository);
    const order = await orderRepo.findById(orderId) as IOrderEx | null;

    if (order && order.authorizations && order.authorizations.length) {
      // Convert order to OrderAuthorization
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

  public async findByAuthorization(authorizationId: acmeData.Key) {
    // Get Authorization via AuthorizationRepository and find requested authorization
    const authzRepo = container.resolve<acmeData.IOrderAuthorizationRepository>(acmeData.diAuthorizationRepository);
    const authz = await authzRepo.findById(authorizationId) as IAuthorizationEx | null;

    if (authz && authz.orders && authz.orders.length) {
      // Convert authorization to OrderAuthorization
      return authz.orders.map((o: any) => new OrderAuthorization({
        orderId: o,
        authorizationId,
      }));
    }

    return [];
  }
}
