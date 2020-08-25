import { IBaseRepository, Key } from "@peculiar/acme-data";
import { BaseObject } from "../models";

export abstract class BaseRepository<T extends BaseObject> implements IBaseRepository<T>
{
  private lastId = 0;
  protected items: T[] = [];

  public async findById(id: Key) {
    return this.items.find(o => { return o.id == id; }) || null;
  }

  public async add(item: T) {
    if (!item.id) {
      item.id = ++this.lastId;
      this.items.push(item);
    } else {
      throw new Error("Element already exists");
    }
    return item;
  }

  public async update(item: T) {
    const updateItem = this.items.find(o => { return o.id == item.id; });
    if (updateItem) {
      const index = this.items.indexOf(updateItem);
      this.items[index] = item;
    } else {
      throw new Error("Element not found");
    }
    return item;
  }

  public async remove(item: T) {
    const removeItem = this.items.find(o => { return o.id == item.id; });
    if (removeItem) {
      const index = this.items.indexOf(item);
      if (index > -1) {
        this.items.splice(index, 1);
      }
    }
    return;
  }
}