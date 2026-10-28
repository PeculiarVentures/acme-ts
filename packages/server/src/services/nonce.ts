import { BaseService } from "./base";
import type { INonceService } from "./types";
import { container, injectable } from "tsyringe";
import type { INonceRepository } from "@peculiar/acme-data";
import { diNonceRepository } from "@peculiar/acme-data";
import { BadNonceError } from "@peculiar/acme-core";

@injectable()
export class NonceService extends BaseService implements INonceService {
  protected nonceRepository = container.resolve<INonceRepository>(diNonceRepository);

  public async create() {
    return await this.nonceRepository.create();
  }

  public async validate(nonce: string) {
    const contains = await this.nonceRepository.contains(nonce);
    if (!contains) {
      throw new BadNonceError(`Bad nonce`);
    }
    await this.nonceRepository.remove(nonce);
  }
}
