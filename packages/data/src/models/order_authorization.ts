import { IBaseObject, Key } from "./base";

export const diOrderAuthorization = "ACME.Models.OrderAuthorization";

export interface IOrderAuthorization extends IBaseObject {
  authorizationId: Key;
  orderId: Key;
}