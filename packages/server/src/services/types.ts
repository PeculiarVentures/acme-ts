import * as protocol from "@peculiar/acme-protocol";
import * as data from "@peculiar/acme-data";
import { Key, IAccount, IExternalAccount } from "@peculiar/acme-data";
import { JsonWebSignature } from "@peculiar/jose";
import { AccountUpdateParams } from "@peculiar/acme-protocol";

export const diConvertService = "ACME.ConvertService";

/**
 * ACME Convert service
 *
 * DI: ACME.ConvertService
 */
export interface IConvertService {
  toAccount(account: IAccount): protocol.Account;
}

export const diDirectoryService = "ACME.DirectoryService";

/**
 * ACME Directory service
 * DI: ACME.DirectoryService
 */
export interface IDirectoryService {
  getDirectory(): Promise<protocol.Directory>;
}

export const diNonceService = "ACME.NonceService";

/**
 * ACME Nonce service
 *
 * DI: ACME.NonceService
 */
export interface INonceService {
  create(): Promise<string>;
  validate(nonce: string): Promise<void>;
}

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
  findByPublicKey(key: JsonWebKey): Promise<IAccount | null>;

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
  update(accountId: Key, contacts: AccountUpdateParams): Promise<IAccount>;

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
  getByUrl(url: string): Promise<IExternalAccount>;
  validate(accountKey: JsonWebKey, token: JsonWebSignature): Promise<IExternalAccount>;
}
