import { IExternalAccountService } from "./types";
import { Key, IExternalAccount, IExternalAccountRepository } from "@peculiar/acme-data";
import { JsonWebSignature, cryptoProvider } from "@peculiar/acme-core";
import { BaseService } from "./base";
import { inject, container } from "tsyringe";

export class ExternalAccountService extends BaseService implements IExternalAccountService {

  public constructor(
    @inject("ACME.IExternalAccountRepository")
    protected externalAccountRepository: IExternalAccountRepository
  ) {
    super();
  }
  public create(account: any): Promise<IExternalAccount> {
    const macKey = cryptoProvider.get().getRandomValues(new Uint8Array(256 >> 3)); // TODO use service options for HMAC key length

    let externalAccount = container.resolve("ACME");
    OnCreateParams(account, data, macKey);
    externalAccount = this.externalAccountRepository.add(externalAccount);

    Logger.Info("External account {id} created", account.Id);

    return externalAccount;
  }

  protected onCreate(externalAccount: IExternalAccount) {
    externalAccount.Key = Base64Url.Encode(macKey);
    externalAccount.Account = data;
    externalAccount.Status = Protocol.ExternalAccountStatus.Pending;
    if (Options.ExternalAccountOptions.ExpiresMinutes != 0) {
      externalAccount.Expires = DateTime.UtcNow.AddMinutes(Options.ExternalAccountOptions.ExpiresMinutes);
    }
  }

  public async getById(id: Key): Promise<IExternalAccount> {
    throw new Error("Method not implemented.");
  }

  public async validate(accountKey: JsonWebKey, token: JsonWebSignature): Promise<IExternalAccount> {
    throw new Error("Method not implemented.");
  }

}