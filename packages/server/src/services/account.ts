import { inject, container, injectable } from "tsyringe";
import { BaseService } from "./base";
import { IAccountRepository, diAccountRepository, IAccount, Key, diAccount } from "@peculiar/acme-data";
import { IExternalAccountService, diExternalAccountService, IAccountService } from "./types";
import { AccountCreateParams } from "@peculiar/acme-protocol";
import { AccountDoesNotExistError, MalformedError } from "@peculiar/acme-core";

@injectable()
export class AccountService extends BaseService implements IAccountService {

  public constructor(
    @inject(diAccountRepository) protected accountRepository: IAccountRepository,
    @inject(diExternalAccountService) protected externalAccountService: IExternalAccountService) {
    super();
  }

  public async create(key: JsonWebKey, params: AccountCreateParams) {
    // Creates account
    let account = container.resolve<IAccount>(diAccount);
    this.onCreate(account, key, params);

    // TODO
    // if (Options.ExternalAccountOptions.Type != ExternalAccountType.None) {
    //   // Uses external account binding
    //   if (Options.externalAccountOptions.Type == ExternalAccountType.Required
    //     && params.externalAccountBinding == null)
    //   {
    //     throw new MalformedError("externalAccountBinding is required"); // TODO check rfc error
    //   }

    //   if (params.ExternalAccountBinding != null)
    //   {
    //     var eab = ExternalAccountService.Validate(key, @params.ExternalAccountBinding);
    //     if (eab.Status == ExternalAccountStatus.Invalid) {
    //       throw new MalformedException("externalAccountBinding has wrong signature"); // TODO check rfc error
    //     }
    //     account.ExternalAccountId = eab.Id;
    //   }
    // }

    // Adds account
    account = await this.accountRepository.add(account);

    // TODO Logger.Info("Account {id} created", account.Id);

    return account;
  }

  protected onCreate(account: IAccount, key: JsonWebKey, params: AccountCreateParams) {
    account.key = key;
    account.contacts = params.contact || [];
    account.termsOfServiceAgreed = params.termsOfServiceAgreed || false;
  }

  public async deactivate(accountId: Key) {
    // Get account
    let account = await this.getById(accountId);

    // Assign values
    account.status = "deactivated";

    // Save changes
    account = await this.accountRepository.update(account);

    // TODO Logger.Info("Account {id} deactivated", account.Id);

    // Return JSON
    return account;
  }

  public async getById(accountId: Key) {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountDoesNotExistError();
    }
    return account;
  }

  public async getByPublicKey(key: JsonWebKey) {
    const account = await this.findByPublicKey(key);

    if (!account) {
      throw new AccountDoesNotExistError();
    }

    return account;
  }

  public async findByPublicKey(key: JsonWebKey) {
    return this.accountRepository.findByPublicKey(key);
  }

  public async revoke(accountId: Key) {
    // Get account
    let account = await this.getById(accountId);

    // Assign values
    account.status = "revoked";


    // Save changes
    account = await this.accountRepository.update(account);

    // TODO Logger.Info("Account {id} revoked", account.Id);

    // Return JSON
    return account;
  }
  public async update(accountId: Key, contacts: string[]) {
    // Get account
    let account = await this.getById(accountId);

    // Assign values
    account.contacts = contacts;

    // Save changes
    account = await this.accountRepository.update(account);

    // TODO Logger.Info("Account {id} updated", account.Id);

    // Return JSON
    return account;
  }

  public async changeKey(accountId: Key, key: JsonWebKey) {
    // https://tools.ietf.org/html/rfc8555#section-7.3.5

    // Get account
    let account = await this.getById(accountId);

    // Check key
    const duplicateAccount = await this.accountRepository.findByPublicKey(key);
    if (duplicateAccount) {
      // If there is an existing account with the new key
      // provided, then the server SHOULD use status code 409 (Conflict) and
      // provide the URL of that account in the Location header field.
      throw new MalformedError("Account with the same key already exists", 409);
    }

    // Change key
    account.key = key;

    // Save changes
    account = await this.accountRepository.update(account);

    // TODO Logger.Info("Account {id} key changed", account.Id);

    // Return JSON
    return account;
  }
}