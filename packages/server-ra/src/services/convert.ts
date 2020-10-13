import { IExternalAccount } from "@peculiar/acme-data";
import { ConvertService } from "@peculiar/acme-server";
import { EabChallenge } from "./types";

export class RaConvertService extends ConvertService {
  public toEabChallenge(externalAccount: IExternalAccount) {
    const newEab: EabChallenge = {
      challenge: externalAccount.key,
      kid: `${this.options.baseAddress}/kid/${externalAccount.id}`,
    };
    return newEab;
  }
}
