import * as core from "@peculiar/acme-core";
import { MalformedError } from "@peculiar/acme-core";
import { IAccountRepository, diAccountRepository, IAccount, Key, diAccount } from "@peculiar/acme-data";
import { AccountCreateParams, AccountUpdateParams } from "@peculiar/acme-protocol";
import { JsonWebKey, JsonWebSignature } from "@peculiar/jose";
import { inject, container, injectable } from "tsyringe";
import { BaseService, diServerOptions, IServerOptions } from "./base";
import { IExternalAccountService, diExternalAccountService, IAccountService } from "./types";

@injectable()
export class AccountService extends BaseService implements IAccountService {

  public constructor(
    @inject(diAccountRepository) protected accountRepository: IAccountRepository,
    @inject(diExternalAccountService) protected externalAccountService: IExternalAccountService,
    @inject(core.diLogger) logger: core.ILogger,
    @inject(diServerOptions) options: IServerOptions) {
    super(options, logger);
  }

  public async create(key: JsonWebKey, params: AccountCreateParams) {
    if (params.contact) {
      this.validateContacts(params.contact);
    }

    // Creates account
    let account = container.resolve<IAccount>(diAccount);
    await this.onCreate(account, key, params);

    if (this.options.meta?.externalAccountRequired) {
      // Uses external account binding
      if (!params.externalAccountBinding) {
        throw new MalformedError("externalAccountBinding is required");
      }
      const jws = new JsonWebSignature();
      jws.fromJSON(params.externalAccountBinding);

      const eab = await this.externalAccountService.validate(key, jws);
      if (eab.status === "invalid") {
        throw new MalformedError("externalAccountBinding has wrong signature");
      }
      account.externalAccountId = eab.id;
    }

    // Adds account
    account = await this.accountRepository.add(account);

    this.logger.info(`Account ${account.id} created`);

    return account;
  }

  protected async onCreate(account: IAccount, key: JsonWebKey, params: AccountCreateParams) {
    account.status = "valid";
    account.key = key;
    account.thumbprint = await key.getThumbprint();
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
      throw new core.AccountDoesNotExistError();
    }
    return account;
  }

  public async getByPublicKey(key: JsonWebKey) {
    const account = await this.findByPublicKey(key);

    if (!account) {
      throw new core.AccountDoesNotExistError();
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

    this.logger.info(`Account ${account.id} revoked`);

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
      throw new core.ArgumentNullError("contacts");
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
      throw new core.UnsupportedContactError();
    }

    // eslint-disable-next-line no-control-regex
    const pattern = /^mailto:(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/g;
    if (!pattern.test(contact)) {
      throw new core.InvalidContactError;
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
      throw new core.MalformedError("Account with the same key already exists", 409);
    }

    // Change key
    account.key = key;
    account.thumbprint = await key.getThumbprint();

    // Save changes
    account = await this.accountRepository.update(account);

    this.logger.info(`Account ${account.id} key changed`);

    // Return JSON
    return account;
  }
}