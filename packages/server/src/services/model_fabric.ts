import { container } from "tsyringe";
import * as data from "@peculiar/acme-data";

export function error() {
  return container.resolve<data.IError>(data.diError);
}

export function account() {
  return container.resolve<data.IAccount>(data.diAccount);
}

export function order() {
  return container.resolve<data.IOrder>(data.diOrder);
}

export function authorization() {
  return container.resolve<data.IAuthorization>(data.diAuthorization);
}

export function orderAuthorization() {
  return container.resolve<data.IOrderAuthorization>(data.diOrderAuthorization);
}

export function certificate() {
  return container.resolve<data.ICertificate>(data.diCertificate);
}

export function challenge() {
  return container.resolve<data.IChallenge>(data.diChallenge);
}