import { IDirectoryService } from "./types";
import { Directory } from "@peculiar/acme-protocol";
import { BaseService } from "./base";
import { injectable } from "tsyringe";

@injectable()
export class DirectoryService extends BaseService implements IDirectoryService {

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

    this.onGetDirectory(directory);

    return directory;
  }

  protected onGetDirectory(directory: Directory): void {
    directory;
  }

}