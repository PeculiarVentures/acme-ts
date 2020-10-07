import * as protocol from "@peculiar/acme-protocol";
import { BaseService } from "./base";
import { IConvertService } from "./types";
import * as data from "@peculiar/acme-data";
import { injectable, container } from "tsyringe";
import { MalformedError } from "@peculiar/acme-core";

@injectable()
export class ConvertService extends BaseService implements IConvertService {

  protected externalAccountRepository = container.resolve<data.IExternalAccountRepository>(data.diExternalAccountRepository);
  protected orderAuthorizationRepository = container.resolve<data.IOrderAuthorizationRepository>(data.diOrderAuthorizationRepository);
  protected authorizationRepository = container.resolve<data.IAuthorizationRepository>(data.diAuthorizationRepository);
  protected challengeRepository = container.resolve<data.IChallengeRepository>(data.diChallengeRepository);

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
      finalize: `${this.options.baseAddress}/finalize/${data.id}`,
    };
    if (data.notBefore) {
      order.notBefore = data.notBefore.toISOString();
    }
    if (data.notAfter) {
      order.notAfter = data.notAfter.toISOString();
    }
    if (data.expires) {
      order.expires = data.expires.toISOString();
    }
    if (data.error) {
      order.error = await this.toError(data.error);
    }
    if (data.certificate) {
      order.certificate = `${this.options.baseAddress}/cert/${data.certificate}`;
    }

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

    const authz: protocol.Authorization = {
      identifier,
      status: data.status,
      wildcard: data.wildcard,
      challenges: await Promise.all(challenges.map(o => this.toChallenge(o))),
    };
    if (data.expires) {
      authz.expires = data.expires.toISOString();
    }

    return authz;
  }

  public async toChallenge(data: data.IChallenge): Promise<protocol.Challenge> {
    const challenge: protocol.Challenge = {
      status: data.status,
      type: data.type,
      token: data.token,
      url: `${this.options.baseAddress}/challenge/${data.id}`,
    };
    if (data.validated) {
      challenge.validated = data.validated.toISOString();
    }
    if (data.error) {
      challenge.error = await this.toError(data.error);
    }

    return challenge;
  }

  public async toError(data: data.IError | data.ISubProblem): Promise<protocol.Error> {
    const err: protocol.Error = {
      detail: data.detail,
      type: data.type,
    };

    if ("subproblems" in data) {
      if (data.subproblems && data.subproblems.length) {
        err.subproblems = await Promise.all(data.subproblems.map(o => this.toError(o)));
      }
    }

    return err;
  }

  public async toOrderList(orders: data.IOrder[]): Promise<protocol.OrderList> {
    const orderList: protocol.OrderList = {
      orders: orders.map(o => `${this.options.baseAddress}/order/${o.id}`),
    };
    return orderList;
  }
}