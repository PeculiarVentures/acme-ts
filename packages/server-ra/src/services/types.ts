export interface IProfile {
  email?: string;
  phone?: string;
}

export const diProviderService = "Ra.ProviderService";

export interface IProviderService {
  identifier: string;
  getProfile(token: string): Promise<IProfile>;
}

export interface EabChallenge {
  kid: string;
  challenge: string;
}
