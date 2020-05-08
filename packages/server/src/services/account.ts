import { inject } from "tsyringe";
import { BaseService } from "./base";
import { IAccountRepository, diAccountRepository, IAccount, Key } from "@peculiar/acme-data";
import { IExternalAccountService, diExternalAccountService, IAccountService } from "./types";
import { AccountCreateParams } from "@peculiar/acme-protocol";

export class AccountService extends BaseService implements IAccountService {

  public constructor(
    @inject(diAccountRepository) protected accountRepository: IAccountRepository,
    @inject(diExternalAccountService) protected externalAccountService: IExternalAccountService) {
    super();
  }
  public create(key: JsonWebKey, params: AccountCreateParams): Promise<IAccount> {
    throw new Error("Method not implemented.");
  }
  public deactivate(accountId: Key): Promise<IAccount> {
    throw new Error("Method not implemented.");
  }
  public getById(accountId: Key): Promise<IAccount> {
    throw new Error("Method not implemented.");
  }
  public getByPublicKey(key: JsonWebKey): Promise<IAccount> {
    throw new Error("Method not implemented.");
  }
  public findByPublicKey(key: JsonWebKey): Promise<IAccount> {
    throw new Error("Method not implemented.");
  }
  public revoke(accountId: Key): Promise<IAccount> {
    throw new Error("Method not implemented.");
  }
  public update(accountId: Key, contacts: string[]): Promise<IAccount> {
    throw new Error("Method not implemented.");
  }
  public changeKey(accountId: Key, key: JsonWebKey): Promise<IAccount> {
    throw new Error("Method not implemented.");
  }
}