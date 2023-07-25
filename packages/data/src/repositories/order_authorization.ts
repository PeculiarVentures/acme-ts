import { IBaseRepository } from "./base";
import { IOrderAuthorization, Key } from "../models";

export const diOrderAuthorizationRepository = "ACME.OrderAuthorizationRepository";

export interface IOrderAuthorizationRepository extends IBaseRepository<IOrderAuthorization> {
  /**
   * Find all authorizations for the given order.
   * @param orderId - The order id.
   * @returns The list of OrderAuthorization.
   */
  findByOrder(orderId: Key): Promise<IOrderAuthorization[]>;
  /**
   * Find all orders for the given authorization.
   * @param authId - The authorization id.
   * @returns The list of OrderAuthorization.
   */
  findByAuthorization(authId: Key): Promise<IOrderAuthorization[]>;
}
