import { IBaseRepository, Key } from "@peculiar/acme-data";
import { BaseObject } from "..";

export abstract class BaseRepository<T extends BaseObject> implements IBaseRepository<T>
{
  public constructor(protected items: T[] = []) { }

  public async findById(id: Key) {
    return this.items.find(o => { return o.id === id; }) || null;
  }

  public async add(item: T) {
    if (!this.items.includes(item)) {
      this.items.push(item);
    } else {
      throw new Error("Element already exists");
    }
    return item;
  }

  public async update(item: T) {
    const updateItem = this.items.find(o => { return o.id === item.id; });
    if (updateItem) {
      const index = this.items.indexOf(updateItem);
      this.items[index] = item;
    } else {
      throw new Error("Element not found");
    }
    return item;
  }

  public async remove(item: T) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
    }
    return ;
  }
}