import { IBaseObject, Key } from "./base";

export interface IOrderAuthorization extends IBaseObject {
  authorizationId: Key;
  orderId: Key;
}