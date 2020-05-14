import { MalformedError } from "@peculiar/acme-core";

export const diServerOptions = "ACME.ServerOptions";

/**
 * ACME Server options
 *
 * DI: ACME.ServerOptions
 */
export interface IServerOptions {
  baseAddress: string;
  formattedResponse?: boolean;
}

export class BaseService {

  public constructor(
    public options: IServerOptions
  ) { }

  public getKeyIdentifier(kid: string) {
    const res = /\/([^/?]+)\??[^/]*$/.exec(kid)?.[1];
    if (!res) {
      throw new MalformedError("Cannot get key identifier from the 'kid'");
    }
    return res;
  }
}
