export interface IProfile {
  email?: string;
  phone?: string;
}

export const diProviderService = "Ra.ProviderService";

export interface IProviderService {
  readonly type: string;
  getProfile(token: string): Promise<IProfile>;
}
