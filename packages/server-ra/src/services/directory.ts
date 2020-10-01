import { Directory } from "@peculiar/acme-protocol";
import { injectable } from "tsyringe";
import { DirectoryService } from "@peculiar/acme-server";

@injectable()
export class RaDirectoryService extends DirectoryService {

  protected async onGetDirectory(directory: Directory): Promise<void> {
    directory.newEab = `${this.options.baseAddress}/new-eab`;
  }

}