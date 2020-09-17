import { BaseService, diServerOptions, IServerOptions } from "./base";
import { INonceService } from "./types";
import { inject, injectable } from "tsyringe";
import { INonceRepository, diNonceRepository } from "@peculiar/acme-data";
import { BadNonceError, diLogger, ILogger } from "@peculiar/acme-core";

@injectable()
export class NonceService extends BaseService implements INonceService {

  public constructor(
    @inject(diNonceRepository) protected nonceRepository: INonceRepository,
    @inject(diLogger) logger: ILogger,
    @inject(diServerOptions) options: IServerOptions) {
    super(options, logger);
  }

  public async create() {
    return await this.nonceRepository.create();
  }

  public async validate(nonce: string) {
    const contains = await this.nonceRepository.contains(nonce)
    if (!contains)
    {
        throw new BadNonceError();
    }
    await this.nonceRepository.remove(nonce);
  }

}