import { BaseService } from "@peculiar/acme-server";
import fetch from "node-fetch";
import { injectable } from "tsyringe";

export interface IProfile {
  name: string;
  email: string;
}

export interface IData {
  token: string;
  profile: IProfile;
}

export const diAuth0 = "Auth0";

@injectable()
export class Auth0Service extends BaseService {

  public async getProfile(token: string) {
    const resp = await fetch(`${this.options.auth0Domain}/userinfo`, {
      method: 'GET',
      headers: { Authorization: token },
    });
    if (resp.status !== 200) {
      throw new Error(resp.statusText);
    }
    const profile = await resp.json();
    if (!Object.keys(profile)) {
      throw new Error("Profile is empty");
    }
    return profile;
  }
}