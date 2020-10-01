import { MalformedError } from "@peculiar/acme-core";
import { BaseService } from "@peculiar/acme-server";
import { container, injectable } from "tsyringe";
import { diProviderService, IProviderService } from "./types";

export const diAuthProviderService = "Ra.AuthProviderService";

@injectable()
export class ProviderService extends BaseService {

  public async getProfile(token: string, providerType?: string) {
    const type = providerType || this.options.defaultProvider;
    const provider = this.getProvider(type);
    return await provider.getProfile(token);
  }

  protected getProviderAll(): IProviderService[] {
    return container.resolveAll<IProviderService>(diProviderService);
  }

  protected getProvider(type: string): IProviderService {
    const providers = this.getProviderAll();
    const provider = providers.filter(o => o.type === type);
    if (!provider.length) {
      throw new MalformedError(`Unsupported provider type '${type}'`);
    }
    if (provider.length > 1) {
      throw new MalformedError(`Several providers have been registered with the same type '${type}'`);
    }
    return provider[0];
  }
}