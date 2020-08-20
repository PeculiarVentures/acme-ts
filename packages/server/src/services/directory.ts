import { IDirectoryService } from "./types";
import { Directory } from "@peculiar/acme-protocol";
import { BaseService, IServerOptions, diServerOptions } from "./base";
import { injectable, inject } from "tsyringe";

@injectable()
export class DirectoryService extends BaseService implements IDirectoryService {

  public constructor(
    @inject(diServerOptions) options: IServerOptions
  ) {
    super(options)
  }

  public async getDirectory() {
    const url = this.options.baseAddress;
    const directory: Directory = {
      newNonce: `${url}new-nonce`,
      newAccount: `${url}new-acct`,
      newAuth: `${url}new-authz`,
      newOrder: `${url}new-order`,
      revokeCert: `${url}revoke`,
      keyChange: `${url}key-change`,
    };

    this.onGetDirectory(directory);

    return directory;
  }

  protected onGetDirectory(directory: Directory): void {
    directory;
  }

}