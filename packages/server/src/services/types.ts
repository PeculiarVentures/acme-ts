import * as protocol from "@peculiar/acme-protocol";
import * as data from "@peculiar/acme-data";
import { JsonWebSignature, JsonWebKey } from "@peculiar/jose";
import { QueryParams, X509Certificates } from "@peculiar/acme-core";

export const diConvertService = "ACME.ConvertService";

/**
 * ACME Convert service
 *
 * DI: ACME.ConvertService
 */
export interface IConvertService {
  toAccount(account: data.IAccount): Promise<protocol.Account>;
  toOrder(order: data.IOrder): Promise<protocol.Order>;
  toOrderList(order: data.IOrder[]): Promise<protocol.OrderList>;
  toAuthorization(auth: data.IAuthorization): Promise<protocol.Authorization>;
  toChallenge(challenge: data.IChallenge): Promise<protocol.Challenge>;
  toError(error: data.IError): Promise<protocol.Error>;
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
  deactivate(accountId: data.Key): Promise<data.IAccount>;

  /**
  * Returns Account by specified Id
  * @param accountId
  */
  getById(accountId: data.Key): Promise<data.IAccount>;

  /**
   * Returns Account by specified JWK
   * @param key JSO Web Key
   */
  getByPublicKey(key: JsonWebKey): Promise<data.IAccount>;

  /**
   * Returns Account by specified JWK
   * @param key JSON web key
   */
  findByPublicKey(key: JsonWebKey): Promise<data.IAccount | null>;

  /**
   * Revokes an Account
   * @param accountId Account identifier
   */
  revoke(accountId: data.Key): Promise<data.IAccount>;

  /**
   * Updates an Account
   * @param accountId Account identifier
   * @param contacts List of contacts
   */
  update(accountId: data.Key, contacts: protocol.AccountUpdateParams): Promise<data.IAccount>;

  /**
   * Changes key for Account
   * @param accountId Account identifier
   * @param key A new key of Account
   */
  changeKey(accountId: data.Key, key: JsonWebKey): Promise<data.IAccount>;
}

export const diExternalAccountService = "ACME.ExternalAccountService";

/**
 * DI: ACME.ExternalAccountService
 */
export interface IExternalAccountService {
  create(account: any): Promise<data.IExternalAccount>;
  getById(id: data.Key): Promise<data.IExternalAccount>;
  getByUrl(url: string): Promise<data.IExternalAccount>;
  validate(accountKey: JsonWebKey, token: JsonWebSignature): Promise<data.IExternalAccount>;
}

export const diAuthorizationService = "ACME.AuthorizationService";

export interface IAuthorizationService {
  /**
   * Returns Authorization by specified Id
   * @param accountId Account identifier
   * @param authId Authorization identifier
   */
  getById(accountId: data.Key, authId: data.Key): Promise<data.IAuthorization>;

  /**
   * Returns actual Authorization by specified Id
   * @param accountId Account identifier
   * @param identifier Authorization identifier
   */
  getActual(accountId: data.Key, identifier: data.IIdentifier): Promise<data.IAuthorization | null>;

  /**
   * Creates new authorization
   * @param accountId Account identifier
   * @param identifier Authorization identifier
   */
  create(accountId: data.Key, identifier: data.IIdentifier): Promise<data.IAuthorization>;

  /**
   * Refreshes status an Authorization
   * @param IAuthorization Authorization
   */
  refreshStatus(item: data.IAuthorization): Promise<data.IAuthorization>;
}

export const diCertificateEnrollmentService = "ACME.CertificateEnrollmentService";

export interface ICertificateEnrollmentService {
  /**
   * Enrolls certificate
   * @param order Order
   * @param request PKCS10 request
   */
  enroll(order: data.IOrder, request: ArrayBuffer): Promise<ArrayBuffer>;

  /**
   * Revokes certificate
   * @param order Order
   * @param reason Revoke reason
   */
  revoke(order: data.IOrder, reason: protocol.RevokeReason): Promise<void>;
}

export const diOrderService = "ACME.OrderService";

/**
 * DI: ACME.OrderService
 */
export interface IOrderService {
  /**
   * Creates new Order
   * @param accountId Account identifier
   * @param params Params to create a new Order
   */
  create(accountId: data.Key, params: protocol.OrderCreateParams): Promise<data.IOrder>;

  /**
   * Returns Orders list by Account specific id
   * @param accountId specific id
   * @param query Query params
   */
  getList(accountId: data.Key, query: QueryParams): Promise<data.IOrderList>;

  /**
   * Returns Order by specified Id
   * @param accountId Account identifier
   * @param id Order identifier
   */
  getById(accountId: data.Key, id: data.Key): Promise<data.IOrder>;

  /**
   * Returns actual Order
   * @param accountId Account identifier
   * @param params
   */
  getActual(accountId: data.Key, params: protocol.OrderCreateParams): Promise<data.IOrder | null>;

  /**
   * Enrolls certificate
   * @param accountId Account specific id
   * @param orderId Order specific id
   * @param params Params to finalize order
   */
  enrollCertificate(accountId: data.Key, orderId: data.Key, params: protocol.Finalize): Promise<data.IOrder>;

  /**
   * Returns chain for Certificate
   * @param accountId Account specific id
   * @param param Thumbprint of Certificate
   */
  getCertificate(accountId: data.Key, param: string | ArrayBuffer): Promise<X509Certificates>;

  /**
   * Revokes Certificate
   * @param accountId Account identifier
   * @param params Params to revoke certificate
   */
  revokeCertificate(accountId: data.Key | JsonWebKey, params: protocol.RevokeCertificateParams): Promise<void>;
}

export const diChallengeService = "ACME.ChallengeService";

export interface IChallengeService {
  /**
   * Returns Challenge by identifier
   * @param id Identifier
   */
  getById(id: data.Key): Promise<data.IChallenge>;

  /**
   * Validates a challenge
   * @param challenge Challenge
   */
  validate(challenge: data.IChallenge): Promise<void>;

  /**
   * Creates new Challenge
   * @param authId The identifier of Authorization
   * @param type THe type of Challenge
   */
  create(authId: data.Key, type: string): Promise<data.IChallenge>;

  /**
   * Returns array of Challenge
   * @param id The identifier of Authorization
   */
  getByAuthorization(id: data.Key): Promise<data.IChallenge[]>;
}
