import { INonceRepository } from "@peculiar/acme-data";

export class NonceRepository implements INonceRepository {

  private items: string[] = [];

  public async remove(value: string) {
    const index = this.items.indexOf(value);
    if (index > -1) {
      this.items.splice(index, 1);
    }
  }

  public async create(): Promise<string> {
    const item = (new Date()).toTimeString();
    this.items.push(item);
    return item;
  }

  public async contains(value: string) {
    return this.items.includes(value);
  }
}