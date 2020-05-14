import { IDirectoryService } from "./types";
import { Directory } from "@peculiar/acme-protocol";
import { BaseService } from "./base";
import { injectable } from "tsyringe";

@injectable()
export class DirectoryService extends BaseService implements IDirectoryService {

  public async getDirectory() {
    const directory: Directory = {
      newNonce: "",
      newAccount: "",
      newAuthz: "",
      newOrder: "",
      revokeCert: "",
      keyChange: "",
    };

    this.onGetDirectory(directory);

    return directory;
  }

  protected onGetDirectory(directory: Directory): void {
    directory;
  }

}