import { INonceRepository } from "@peculiar/acme-data";
import { cryptoProvider } from "@peculiar/acme-core";
import { Convert } from "pvtsutils";

export class NonceRepository implements INonceRepository {

  private items: string[] = [];

  public async remove(value: string) {
    const index = this.items.indexOf(value);
    if (index > -1) {
      this.items.splice(index, 1);
    }
  }

  public async create(): Promise<string> {
    const crypto = cryptoProvider.get();
    const buffer = crypto.getRandomValues(new Uint8Array(20));
    const item = Convert.ToBase64Url(buffer);
    this.items.push(item);
    return item;
  }

  public async contains(value: string) {
    return this.items.includes(value);
  }
}