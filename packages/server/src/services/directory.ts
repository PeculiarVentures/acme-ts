import { diEndpointService, IDirectoryService, IEndpointService } from "./types";
import { Directory } from "@peculiar/acme-protocol";
import { BaseService } from "./base";
import { container, injectable } from "tsyringe";
import { MalformedError } from "@peculiar/acme-core";

@injectable()
export class DirectoryService extends BaseService implements IDirectoryService {

  protected endpoints = container.resolveAll<IEndpointService>(diEndpointService);

  public async getDirectory() {
    const url = this.options.baseAddress;
    const directory: Directory = {
      newNonce: `${url}/new-nonce`,
      newAccount: `${url}/new-acct`,
      newAuthz: `${url}/new-authz`,
      newOrder: `${url}/new-order`,
      revokeCert: `${url}/revoke`,
      keyChange: `${url}/key-change`,
    };

    if (this.options.meta && Object.keys(this.options.meta).length) {
      directory.meta = this.options.meta;
    }

    await this.onGetDirectory(directory);

    // Add endpoints info
    if (!this.endpoints.length) {
      throw new MalformedError("No endpoints found");
    } else {
      const types = this.endpoints.map(o => `${this.options.baseAddress}/endpoint/${o.type}`);
      if (!directory.meta) {
        directory.meta = {
          endpoints: types,
        };
      } else {
        directory.meta.endpoints = types;
      }
    }

    this.logger.debug(`Directory by '${url}'`);

    return directory;
  }

  protected async onGetDirectory(directory: Directory): Promise<void> {
    directory;
  }

}
