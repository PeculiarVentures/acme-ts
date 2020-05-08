import { IBaseRepository, Key } from "@peculiar/acme-data";
import { BaseObject } from "..";

export abstract class BaseRepository<T extends BaseObject> implements IBaseRepository<T>
{
  public constructor(protected items: T[] = []) { }

  public findById(id: Key): Promise<T | null> {
    return new Promise<T>(() => this.items.find(o => { return o.id === id; }) || null);
  }

  public add(item: T): Promise<T> {
    if (!this.items.includes(item)) {
      this.items.push(item);
    }
    return new Promise<T>(() => item);
  }

  public update(item: T): Promise<T> {
    const updateItem = this.items.find(o => { return o.id === item.id; });
    if (updateItem) {
      const index = this.items.indexOf(updateItem);
      this.items[index] = item;
    } else {
      throw new Error("Element not found");
    }
    return new Promise<T>(() => item);
  }

  public remove(item: T): Promise<void> {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
    }
    return new Promise<void>(() => { return; });
  }
}