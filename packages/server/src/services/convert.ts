import * as protocol from "@peculiar/acme-protocol";
import { BaseService, diServerOptions, IServerOptions } from "./base";
import { IConvertService } from "./types";
import * as data from "@peculiar/acme-data";
import { injectable, inject } from "tsyringe";
import { MalformedError, diLogger, ILogger } from "@peculiar/acme-core";

@injectable()
export class ConvertService extends BaseService implements IConvertService {

  public constructor(
    @inject(data.diExternalAccountRepository) public externalAccountRepository: data.IExternalAccountRepository,
    @inject(data.diOrderAuthorizationRepository) public orderAuthorizationRepository: data.IOrderAuthorizationRepository,
    @inject(data.diAuthorizationRepository) public authorizationRepository: data.IAuthorizationRepository,
    @inject(data.diChallengeRepository) public challengeRepository: data.IChallengeRepository,
    @inject(diLogger) logger: ILogger,
    @inject(diServerOptions) options: IServerOptions) {
    super(options, logger);
  }

  public async toAccount(data: data.IAccount): Promise<protocol.Account> {
    const account: protocol.Account = {
      contact: data.contacts,
      status: data.status,
      termsOfServiceAgreed: data.termsOfServiceAgreed,
      orders: `${this.options.baseAddress}/orders`,
    };
    if (data.externalAccountId) {
      const ext = await this.externalAccountRepository.findById(data.externalAccountId);
      if (!ext) {
        throw new MalformedError(`External Account ${data.externalAccountId} not exist`);
      }
      account.externalAccountBinding = ext.account;
    }
    return account;
  }

  public async toOrder(data: data.IOrder): Promise<protocol.Order> {
    const orderAuthzs = await this.orderAuthorizationRepository.findByOrder(data.id);
    if (!orderAuthzs) {
      throw new MalformedError(`Order authorization ${data.id} not exist`);
    }
    const authzs = await Promise.all(orderAuthzs.map(async o => {
      const auth = await this.authorizationRepository.findById(o.authorizationId);
      if (!auth) {
        throw new MalformedError(`Authorization ${o.authorizationId} not exist`);
      }
      return auth;
    }));

    const order: protocol.Order = {
      identifiers: authzs.map(o => { return { ...o.identifier }; }),
      authorizations: authzs.map(o => `${this.options.baseAddress}/authz/${o.id}`),
      status: data.status,
      notBefore: data.notBefore?.toUTCString(),
      notAfter: data.notAfter?.toUTCString(),
      expires: data.expires?.toUTCString(),
      error: data.error ? await this.toError(data.error) : undefined,
      finalize: `${this.options.baseAddress}/finalize/${data.id}`,
      certificate: data.certificate && data.certificate.rawData ? `${this.options.baseAddress}/cert/${data.certificate.thumbprint}` : undefined,
    };
    return order;
  }

  public async toAuthorization(data: data.IAuthorization): Promise<protocol.Authorization> {
    const challenges = await this.challengeRepository.findByAuthorization(data.id);
    if (!challenges) {
      throw new MalformedError(`Authorization ${data.id} not exist`);
    }
    const identifier: data.IIdentifier = {
      type: data.identifier.type,
      value: data.identifier.value,
    };

    const auth: protocol.Authorization = {
      expires: data.expires?.toUTCString(),
      identifier,
      status: data.status,
      wildcard: data.wildcard,
      challenges: await Promise.all(challenges.map(o => this.toChallenge(o))),
    };
    return auth;
  }

  public async toChallenge(data: data.IChallenge): Promise<protocol.Challenge> {
    const challenge: protocol.Challenge = {
      status: data.status,
      type: data.type,
      validated: data.validated?.toUTCString(),
      error: data.error ? await this.toError(data.error) : undefined,
      token: data.token,
      url: `${this.options.baseAddress}/challenge/${data.id}`,
    };
    return challenge;
  }

  public async toError(data: data.IError): Promise<protocol.Error> {
    const err: protocol.Error = {
      detail: data.detail,
      type: data.type,
      subproblems: data.subproblems ? data.subproblems.map(o => {
        const subError: protocol.Error = {
          detail: o.detail,
          type: o.type,
        };
        return subError;
      }) : undefined,
    };
    return err;
  }

  public async toOrderList(orders: data.IOrder[]): Promise<protocol.OrderList> {
    const orderList: protocol.OrderList = {
      orders: orders.map(o => `${this.options.baseAddress}/order/${o.id}`),
    };
    return orderList;
  }
}