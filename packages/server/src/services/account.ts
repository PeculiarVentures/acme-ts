import { inject, container, injectable } from "tsyringe";
import { BaseService, diServerOptions, IServerOptions } from "./base";
import { IAccountRepository, diAccountRepository, IAccount, Key, diAccount } from "@peculiar/acme-data";
import { IExternalAccountService, diExternalAccountService, IAccountService } from "./types";
import { AccountCreateParams, AccountUpdateParams } from "@peculiar/acme-protocol";
import { AccountDoesNotExistError, MalformedError, UnsupportedContactError, ArgumentNullError, Logger, diLogger, ILogger, InvalidContactError } from "@peculiar/acme-core";
import { JsonWebKey } from "@peculiar/jose";

@injectable()
export class AccountService extends BaseService implements IAccountService {

  public constructor(
    @inject(diAccountRepository) protected accountRepository: IAccountRepository,
    @inject(diExternalAccountService) protected externalAccountService: IExternalAccountService,
    @inject(diLogger) logger: ILogger,
    @inject(diServerOptions) options: IServerOptions) {
    super(options, logger);
  }

  public async create(key: JsonWebKey, params: AccountCreateParams) {
    if (params.contact) {
      this.validateContacts(params.contact);
    }

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

    this.logger.info(`Account ${account.id} created`);

    return account;
  }

  protected onCreate(account: IAccount, key: JsonWebKey, params: AccountCreateParams) {
    account.status = "valid";
    account.key = key;
    account.contacts = params.contact;
    account.termsOfServiceAgreed = params.termsOfServiceAgreed;
  }

  public async deactivate(accountId: Key) {
    // Get account
    let account = await this.getById(accountId);

    // Assign values
    account.status = "deactivated";

    // Save changes
    account = await this.accountRepository.update(account);

    this.logger.info(`Account ${account.id} deactivated`);

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

  public async update(accountId: Key, params: AccountUpdateParams) {
    if (params.contact) {
      this.validateContacts(params.contact);
    }

    // Get account
    let account = await this.getById(accountId);

    // Assign values
    this.onUpdateParams(account, params);

    // Save changes
    account = await this.accountRepository.update(account);

    // Return JSON
    return account;
  }

  protected onUpdateParams(account: IAccount, params: AccountUpdateParams) {
    if (params.contact) {
      account.contacts = params.contact;
    }
  }

  protected validateContacts(contacts: string[]) {
    if (!contacts) {
      throw new ArgumentNullError("contacts");
    }

    contacts.forEach(contact => {
      this.onValidateContact(contact);
    });
  }

  protected onValidateContact(contact: string) {
    this.isMailto(contact);
  }

  protected isMailto(contact: string) {
    const patternType = /^mailto:/g;
    if (!patternType.test(contact)) {
      throw new UnsupportedContactError();
    }

    // eslint-disable-next-line no-control-regex
    const pattern = /^mailto:(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/g;
    if (!pattern.test(contact)) {
      throw new InvalidContactError;
    }
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