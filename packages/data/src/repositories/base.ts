import { IBaseObject, Key } from "../models";

export interface IBaseRepository<T extends IBaseObject> {
  findById(id: Key): Promise<T | null>;
  add(item: T): Promise<T>;
  update(item: T): Promise<T>;
  remove(item: T): Promise<void>;
}
