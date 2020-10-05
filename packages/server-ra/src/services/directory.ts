import { container, injectable } from "tsyringe";
import { DirectoryService } from "@peculiar/acme-server";
import { Directory, DirectoryMetadata } from "@peculiar/acme-protocol";
import { diProviderService, IProviderService } from "./types";
import { MalformedError } from "@peculiar/acme-core";

@injectable()
export class RaDirectoryService extends DirectoryService {

  protected async onGetDirectory(directory: Directory): Promise<void> {
    directory.newEab = `${this.options.baseAddress}/new-eab`;

    const providers = container.resolveAll<IProviderService>(diProviderService);

    if (!providers.length) {
      throw new MalformedError("No providers found");
    }
    const authzProviders = providers.map(o => `${this.options.baseAddress}/providers/${o.identifier}`);

    if (!directory.meta) {
      const meta: DirectoryMetadata = {
        authzProviders,
      };
      directory.meta = meta;
    } else {
      directory.meta.authzProviders = authzProviders;
    }
  }

}