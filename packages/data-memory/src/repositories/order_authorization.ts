import { IOrderAuthorizationRepository, IOrderAuthorization } from "@peculiar/acme-data";
import { BaseRepository } from "./base";

export class OrderAuthorizationRepository extends BaseRepository<IOrderAuthorization> implements IOrderAuthorizationRepository {

  public async findByOrder(orderId: number) {
    return this.items.filter(o => o.orderId === orderId) || null;
  }

  public async findByAuthorization(authId: number) {
    return this.items.filter(o => o.authorizationId === authId) || null;
  }
}