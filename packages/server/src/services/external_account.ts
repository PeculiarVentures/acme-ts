import { IExternalAccountService } from "./types";
import { Key, IExternalAccount, IExternalAccountRepository, diExternalAccount, diExternalAccountRepository } from "@peculiar/acme-data";
import { cryptoProvider, MalformedError } from "@peculiar/acme-core";
import { BaseService } from "./base";
import { container, injectable } from "tsyringe";
import { Convert } from "pvtsutils";
import { JsonWebSignature } from "@peculiar/jose";

@injectable()
export class ExternalAccountService extends BaseService implements IExternalAccountService {

protected externalAccountRepository = container.resolve<IExternalAccountRepository>(diExternalAccountRepository);

  public async create(account: any) {
    const macKey = cryptoProvider.get().getRandomValues(new Uint8Array(256 >> 3)); // TODO use service options for HMAC key length

    let externalAccount = container.resolve<IExternalAccount>(diExternalAccount);
    this.onCreate(externalAccount, account, macKey);
    externalAccount = await this.externalAccountRepository.add(externalAccount);

    this.logger.info(`External account ${externalAccount.id} created`);

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

      this.logger.info(`External account ${externalAccount.id} status updated to ${externalAccount.status}`);
    }
    return externalAccount;
  }

  public async getByUrl(url: string): Promise<IExternalAccount> {
    const id = await this.getKeyIdentifier(url);
    return this.getById(id);
  }

  public async validate(accountKey: JsonWebKey, token: JsonWebSignature): Promise<IExternalAccount> {
    const header = token.getProtected();

    // TODO implement function to compare keys
    // const eabPayload = token.getPayload<JsonWebKey>();
    // if (!eabPayload.Equals(accountKey)) {
    //   throw new MalformedError("Signed content in externalAccountBinding doesn't match to requirement"); // TODO check rfc error
    // }
    const matches = /([^/]+)$/.exec(header.kid!);
    // TODO Add check on null
    const externalAccount = await this.getById(matches![1]);
    if (externalAccount.status !== "pending") {
      throw new MalformedError("External account has wrong status"); // TODO check rfc error
    }

    const key = Convert.FromBase64Url(externalAccount.key);

    const hmac = await cryptoProvider.get().subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await token.verify(hmac, cryptoProvider.get());
    externalAccount.status = ok ? "valid" : "invalid";
    await this.externalAccountRepository.update(externalAccount);

    this.logger.info(`External account ${externalAccount.id} status updated to ${externalAccount.status}`);

    return externalAccount;
  }

}