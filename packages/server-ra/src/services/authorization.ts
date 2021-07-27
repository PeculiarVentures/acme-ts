import { MalformedError } from "@peculiar/acme-core";
import { IAccount, IAuthorization, IExternalAccount, Key } from "@peculiar/acme-data";
import { Identifier } from "@peculiar/acme-protocol";
import * as acmeServer from "@peculiar/acme-server";
import { container, injectable } from "tsyringe";

@injectable()
export class RaAuthorizationService extends acmeServer.AuthorizationService {

  private account: IAccount | null = null;
  private eab: IExternalAccount | null = null;

  public eabService = container.resolve<acmeServer.IExternalAccountService>(acmeServer.diExternalAccountService);
  public accountService = container.resolve<acmeServer.IAccountService>(acmeServer.diAccountService);

  private async getAccount(accountId: Key) {
    if (this.account && this.account.id === accountId) {
      return this.account;
    } else {
      return await this.accountService.getById(accountId);
    }
  }

  private async getEab(externalAccountId: Key) {
    if (this.eab && this.eab.id === externalAccountId) {
      return this.eab;
    } else {
      return await this.eabService.getById(externalAccountId);
    }
  }

  protected override async onCreateParams(auth: IAuthorization, accountId: Key, identifier: Identifier) {
    const account = await this.getAccount(accountId);
    if (!account.externalAccountId) {
      throw new MalformedError("External account doesn't exist");
    }
    const eab = await this.getEab(account.externalAccountId);

    if (identifier.type === "email") {
      if (!eab.account.email || identifier.value !== eab.account.email) {
        throw new MalformedError("Email from request not equal with email from external account");
      }
    } else if (identifier.type === "phone") {
      if (!eab.account.phone_number || identifier.value !== eab.account.phone_number) {
        throw new MalformedError("Phone number from request not equal with phone number from external account");
      }
    } else {
      throw new MalformedError("Not supported type identifier");
    }

    auth.identifier.type = identifier.type;
    auth.identifier.value = identifier.value;
    auth.accountId = accountId;
    auth.status = "pending";

    if (this.options.expireAuthorizationDays > 0) {
      const date = new Date();
      date.setDate(new Date().getDate() + this.options.expireAuthorizationDays);
      auth.expires = date;
    }
  }
}
