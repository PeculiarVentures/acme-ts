import { diLogger, ILogger } from "@peculiar/acme-core";
import { IBaseRepository, Key } from "@peculiar/acme-data";
import { container } from "tsyringe";
import { BaseObject } from "../models";

export abstract class BaseRepository<T extends BaseObject> implements IBaseRepository<T>
{
  private lastId = 0;
  protected items: T[] = [];
  public logger = container.resolve<ILogger>(diLogger);

  public async findById(id: Key): Promise<T | null> {
    this.logger.debug("Get item by id", { id });

    return this.items.find(o => { return o.id == id; }) || null;
  }

  public async add(item: T): Promise<T> {
    if (item.id && await this.findById(item.id)) {
      throw new Error("Element already exists");
    } else {
      if (item.id) {
        this.items.push(item);
      } else {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const id = ++this.lastId;
          if (await this.findById(id)) {
            continue;
          }

          item.id = id;
          this.items.push(item);
          break;
        }
      }
    }

    return item;
  }

  public async update(item: T): Promise<T> {
    const updateItem = this.items.find(o => { return o.id == item.id; });
    if (updateItem) {
      const index = this.items.indexOf(updateItem);
      this.items[index] = item;
    } else {
      throw new Error("Element not found");
    }
    return item;
  }

  public async remove(item: T): Promise<void> {
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
