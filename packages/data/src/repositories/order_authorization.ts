import { IBaseRepository } from "./base";
import { IOrderAuthorization, Key } from "../models";

export interface IOrderAuthorizationRepository extends IBaseRepository<IOrderAuthorization>
{
  findByOrder(orderId: Key): Promise<IOrderAuthorization[]>;
  findByAuthorization(authzId: Key): Promise<IOrderAuthorization[]>;
}
