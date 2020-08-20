import { IBaseRepository } from "./base";
import { IOrderAuthorization, Key } from "../models";

export const diOrderAuthorizationRepository = "ACME.OrderAuthorizationRepository";

export interface IOrderAuthorizationRepository extends IBaseRepository<IOrderAuthorization>
{
  findByOrder(orderId: Key): Promise<IOrderAuthorization[]>;
  findByAuthorization(authId: Key): Promise<IOrderAuthorization[]>;
}
