import * as protocol from "@peculiar/acme-protocol";
import * as data from "@peculiar/acme-data";
import { Key, IAccount, IExternalAccount } from "@peculiar/acme-data";
import { JsonWebSignature } from "@peculiar/acme-core";

export const diAccountService = "ACME.AccountService";

export interface IAccountService {

  /**
   * Creates a new Account
   * @param key Account's JSON web key
   * @param params Params to create a new Account
   */
  create(key: JsonWebKey, params: protocol.AccountCreateParams): Promise<data.IAccount>;

  /**
   * Deactivates an Account by specified Id
   *
   * @param accountId Account identifier
   */
  deactivate(accountId: Key): Promise<IAccount>;

  /**
  * Returns Account by specified Id
  * @param accountId
  */
  getById(accountId: Key): Promise<IAccount>;

  /**
   * Returns Account by specified JWK
   * @param key JSO Web Key
   */
  getByPublicKey(key: JsonWebKey): Promise<IAccount>;

  /**
   * Returns Account by specified JWK
   * @param key JSON web key
   */
  findByPublicKey(key: JsonWebKey): Promise<IAccount>;

  /**
   * Revokes an Account
   * @param accountId Account identifier
   */
  revoke(accountId: Key): Promise<IAccount>;

  /**
   * Updates an Account
   * @param accountId Account identifier
   * @param contacts List of contacts
   */
  update(accountId: Key, contacts: string[]): Promise<IAccount>;

  /**
   * Changes key for Account
   * @param accountId Account identifier
   * @param key A new key of Account
   */
  changeKey(accountId: Key, key: JsonWebKey): Promise<IAccount>;
}

export const diExternalAccountService = "ACME.ExternalAccountService";

/**
 * DI: ACME.ExternalAccountService
 */
export interface IExternalAccountService {
  create(account: any): Promise<IExternalAccount>;
  getById(id: Key): Promise<IExternalAccount>;
  validate(accountKey: JsonWebKey, token: JsonWebSignature): Promise<IExternalAccount>;
}
