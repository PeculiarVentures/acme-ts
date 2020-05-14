import { IExternalAccountService } from "./types";
import { Key, IExternalAccount, IExternalAccountRepository, diExternalAccount, diExternalAccountRepository } from "@peculiar/acme-data";
import { JsonWebSignature, cryptoProvider, MalformedError } from "@peculiar/acme-core";
import { BaseService } from "./base";
import { inject, container, injectable } from "tsyringe";
import { Convert } from "pvtsutils";

@injectable()
export class ExternalAccountService extends BaseService implements IExternalAccountService {

  public constructor(
    @inject(diExternalAccountRepository)
    protected externalAccountRepository: IExternalAccountRepository
  ) {
    super();
  }

  public async  create(account: any) {
    const macKey = cryptoProvider.get().getRandomValues(new Uint8Array(256 >> 3)); // TODO use service options for HMAC key length

    let externalAccount = container.resolve<IExternalAccount>(diExternalAccount);
    this.onCreate(externalAccount, account, macKey);
    externalAccount = await this.externalAccountRepository.add(externalAccount);

    // TODO Logger.Info("External account {id} created", account.Id);

    return externalAccount;
  }

  protected onCreate(externalAccount: IExternalAccount, account: any, key: BufferSource) {
    externalAccount.key = Convert.ToBase64Url(key);
    externalAccount.account = account;
    externalAccount.status = "pending";
    // TODO Options Service
    // if (Options.ExternalAccountOptions.ExpiresMinutes != 0) {
    //   externalAccount.Expires = DateTime.UtcNow.AddMinutes(Options.ExternalAccountOptions.ExpiresMinutes);
    // }
  }

  public async getById(id: Key): Promise<IExternalAccount> {
    const externalAccount = await this.externalAccountRepository.findById(id);
    if (!externalAccount) {
      throw new MalformedError("External account does not exist");
    }
    if (externalAccount.status == "pending" && externalAccount.expires && externalAccount.expires < new Date()) {
      externalAccount.status = "expired";
      await this.externalAccountRepository.update(externalAccount);

      // TODO Logger.Info("External account {id} status updated to {status}", externalAccount.Id, externalAccount.Status);
    }
    return externalAccount;
  }

  public async getByUrl(url: string): Promise<IExternalAccount> {
    const id = await this.getKeyIdentifier(url);
    return this.getById(id);
  }

  public async validate(accountKey: JsonWebKey, token: JsonWebSignature): Promise<IExternalAccount> {
    const header = token.getProtected();

    const eabPayload = token.getPayload<JsonWebKey>();
    // TODO implement function to compare keys
    // if (!eabPayload.Equals(accountKey)) {
    //   throw new MalformedError("Signed content in externalAccountBinding doesn't match to requirement"); // TODO check rfc error
    // }

    const externalAccount = await this.getById(header.kid!);
    if (externalAccount.status != "pending") {
      throw new MalformedError("External account has wrong status"); // TODO check rfc error
    }

    const key = Convert.FromBase64Url(externalAccount.key);

    const hmac = await cryptoProvider.get().subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await token.verify(hmac, cryptoProvider.get());
    externalAccount.status = ok ? "valid" : "invalid";
    await this.externalAccountRepository.update(externalAccount);

    // TODO Logger.Info("External account {id} status updated to {status}", externalAccount.Id, externalAccount.Status);

    return externalAccount;
  }

}