import { MalformedError } from "@peculiar/acme-core";
import { BaseService } from "@peculiar/acme-server";
import { container, injectable } from "tsyringe";
import { diProviderService, IProviderService } from "./types";

export const diAuthProviderService = "Ra.AuthProviderService";

@injectable()
export class ProviderService extends BaseService {

  public async getProfile(token: string, providerIdentifier?: string) {
    const identifier = providerIdentifier || this.options.defaultProvider;
    const provider = this.getProvider(identifier);
    return await provider.getProfile(token);
  }

  protected getProviderAll(): IProviderService[] {
    return container.resolveAll<IProviderService>(diProviderService);
  }

  protected getProvider(identifier: string): IProviderService {
    const providers = this.getProviderAll();
    const provider = providers.filter(o => o.identifier === identifier);
    if (!provider.length) {
      throw new MalformedError(`Unsupported provider type '${identifier}'`);
    }
    if (provider.length > 1) {
      throw new MalformedError(`Several providers have been registered with the same type '${identifier}'`);
    }
    return provider[0];
  }
}