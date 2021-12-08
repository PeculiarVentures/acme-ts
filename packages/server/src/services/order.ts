import * as core from "@peculiar/acme-core";
import * as data from "@peculiar/acme-data";
import * as protocol from "@peculiar/acme-protocol";
import { JsonWebKey } from "@peculiar/jose";
import * as pvtsutils from "pvtsutils";
import { container, injectable } from "tsyringe";
import { BaseService } from "./base";
import * as types from "./types";

export interface ICertificateEnrollParams {
  /**
   * Order
   */
  order: data.IOrder;

  /**
   * Params to finalize
   */
  params: protocol.FinalizeParams;

  /**
   * Any object. Allows transfer data from OnEnrollCertificateBefore to OnEnrollCertificateTask
   */
  data: any;

  /**
   * Flag to cancel standard enroll certificate
   */
  cancel: boolean;
}

@injectable()
export class OrderService extends BaseService implements types.IOrderService {

  protected orderRepository = container.resolve<data.IOrderRepository>(data.diOrderRepository);
  protected certificateService = container.resolve<types.ICertificateService>(types.diCertificateService);
  protected accountService = container.resolve<types.IAccountService>(types.diAccountService);
  protected authorizationService = container.resolve<types.IAuthorizationService>(types.diAuthorizationService);
  protected challengeService = container.resolve<types.IChallengeService>(types.diChallengeService);
  protected orderAuthorizationRepository = container.resolve<data.IOrderAuthorizationRepository>(data.diOrderAuthorizationRepository);

  public async create(accountId: data.Key, params: protocol.OrderCreateParams) {
    if (!params) {
      throw new core.ArgumentNullError();
    }

    await this.challengeService.identifierValidate(params.identifiers);

    // create order
    let order = container.resolve<data.IOrder>(data.diOrder);
    // fill params
    await this.onCreateParams(order, params, accountId);

    // create authorization
    const authorizations = await this.onCreateAuth(order, params);
    order.identifier = await this.computeIdentifier(params.identifiers);

    // save order
    order = await this.orderRepository.add(order);

    // create order authorization
    for (const auth of authorizations) {
      await this.onCreateOrderAuth(order, auth);
    }

    this.logger.debug(`Order created`, {
      account: order.accountId,
      id: order.id,
    });

    await this.refreshStatus(order);

    return order;
  }

  /**
   * Fills parameters to create Order
   * For expended objects need add assign values
   * @param order Order
   * @param params Params to create
   * @param accountId Account identifier
   */
  protected async onCreateParams(order: data.IOrder, params: protocol.OrderCreateParams, accountId: data.Key) {
    order.accountId = accountId;
    if (params.notAfter) {
      order.notAfter = new Date(params.notAfter);
    }
    if (params.notBefore) {
      order.notBefore = new Date(params.notBefore);
    }
  }

  /**
   * Returns hash
   * @param identifiers
   */
  protected async computeIdentifier(identifiers: protocol.Identifier[]) {
    const strIdentifiers = identifiers
      .map(o => `${o.type}:${o.value}`.toLowerCase())
      .sort()
      .join(";");
    const hash = await this.getHash(pvtsutils.Convert.FromUtf8String(strIdentifiers));
    return pvtsutils.Convert.ToHex(hash);
  }

  /**
   * Finds and creates authorizations for order
   * For expended objects need add assign values
   * @param order Order
   * @param params Params to create
   */
  protected async onCreateAuth(order: data.IOrder, params: protocol.OrderCreateParams) {
    const listDate: Date[] = [];
    if (!order.accountId) {
      throw new core.ArgumentNullError();
    }
    const authorizations: data.IAuthorization[] = [];
    for (const identifier of params.identifiers) {
      // get actual or create new authorization
      let auth = await this.authorizationService.getActual(order.accountId, identifier);
      if (!auth) {
        auth = await this.authorizationService.create(order.accountId, identifier);
      }

      authorizations.push(auth);

      // check expires
      if (auth.expires) {
        listDate.push(auth.expires);
      }
    }
    // set min expiration date from authorizations
    order.expires = listDate.sort()[0];
    return authorizations;
  }

  protected async onCreateOrderAuth(order: data.IOrder, auth: data.IAuthorization) {
    const orderAuth = container.resolve<data.IOrderAuthorization>(data.diOrderAuthorization);
    orderAuth.orderId = order.id;
    orderAuth.authorizationId = auth.id;
    await this.orderAuthorizationRepository.add(orderAuth);
  }

  public async getList(accountId: data.Key, query: core.QueryParams) {
    const list = await this.orderRepository.getList(accountId, query, this.options.ordersPageSize);

    this.logger.debug("Get list of orders", {
      account: accountId,
      orders: list.items.map(o => {
        return {
          id: o.id,
          status: o.status,
        };
      }),
      next: list.next,
    });

    return list;
  }

  public async getById(accountId: data.Key, id: data.Key) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new core.ArgumentNullError(`Orders for account '${accountId}' does not found`);
    }

    // check access
    if (order.accountId !== accountId) {
      throw new core.MalformedError("Access denied");
    }

    this.logger.debug(`Get order by id`, {
      id: order.id,
      status: order.status,
    });

    await this.refreshStatus(order);
    return order;
  }

  private async refreshStatus(order: data.IOrder) {
    if (order.status !== "invalid") {
      // Checks expires
      const oldStatus = order.status;
      if (order.expires && order.expires < new Date()) {
        order.status = "invalid";
        await this.orderRepository.update(order);
      }
      else {
        const orderAuthorization = await this.orderAuthorizationRepository.findByOrder(order.id);
        const authorizations = await Promise.all(orderAuthorization.map(o => this.authorizationService.getById(order.accountId!, o.authorizationId)));

        if (order.status === "pending") {
          // Check Auth statuses
          if (authorizations.find(o => !(o.status === "pending"
            || o.status === "valid"))) {
            order.status = "invalid";
            order.error = container.resolve<data.IError>(data.diError);
            order.error.type = core.ErrorType.malformed;
            order.error.detail = "One of order authorizations has wrong status";
            await this.orderRepository.update(order);
          } else if (authorizations.every(o => o.status === "valid")) {
            order.status = "ready";
            await this.orderRepository.update(order);
          }
        }
      }
      if (oldStatus !== order.status) {
        this.logger.debug(`Order status updated`, {
          id: order.id,
          newStatus: order.status,
          oldStatus: oldStatus,
        });
      }
    }
  }

  public async lastByIdentifiers(accountId: data.Key, identifiers: data.IIdentifier[]): Promise<data.IOrder | null> {
    const identifier = await this.computeIdentifier(identifiers);
    const order = await this.orderRepository.lastByIdentifier(accountId, identifier);

    return order;
  }

  public async getActual(accountId: data.Key, params: protocol.OrderCreateParams) {
    if (!params) {
      throw new core.ArgumentNullError();
    }

    const order = await this.onGetActualCheckBefore(params, accountId);

    if (!(!order || order.status === "invalid")) {
      const oldStatus = order.status;
      // Checks expires
      if (order.expires && order.expires < new Date()) {
        order.status = "invalid";
      }
      else {

        // RefreshStatus authorizations
        const orderAuthorization = await this.orderAuthorizationRepository.findByOrder(order.id);
        const authorizations = await Promise.all(orderAuthorization.map(o => this.authorizationService.getById(accountId, o.authorizationId)));

        if (order.status === "pending") {
          // Check Auth statuses
          if (!authorizations.find(o => o.status === "pending"
            || o.status === "valid")) {
            order.status = "invalid";
          }
          else if (authorizations.find(o => o.status === "valid")) {
            order.status = "ready";
          }
        }
      }
      if (oldStatus !== order.status) {
        // Update repository
        await this.orderRepository.update(order);
        this.logger.debug(`Order status updated`, {
          id: order.id,
          newStatus: order.status,
          oldStatus: oldStatus,
        });
      }
    }

    let actual: data.IOrder | null = null;
    if (order
      && (order.status === "pending"
        || order.status === "ready"
        || order.status === "processing")) {

      this.logger.debug("Get actual order");

      actual = order;
    }

    this.logger.debug("Get actual order", {
      order: actual
        ? {
          id: actual.id,
          status: actual.status,
        }
        : null
    });

    return actual;
  }

  public async enrollCertificate(accountId: data.Key, orderId: data.Key, params: protocol.FinalizeParams) {
    if (!params.csr) {
      throw new core.ArgumentNullError();
    }
    const order = await this.getById(accountId, orderId);
    const identifiers = await this.getIdentifiers(order);
    await this.challengeService.csrValidate(identifiers, params.csr);

    // Check status ready
    if (order.status !== "ready") {
      throw new core.AcmeError(core.ErrorType.orderNotReady);
    }

    const certificateEnrollParams: ICertificateEnrollParams =
    {
      order: order,
      params: params,
      data: {},
      cancel: false
    };

    try {
      await this.onEnrollCertificateBefore(certificateEnrollParams);
    }
    catch (err) {
      // return invalid order
      await this.createOrderError(
        err instanceof Error
          ? err
          : new Error(`Unknown error '${err}'`),
        certificateEnrollParams.order);
      return certificateEnrollParams.order;
    }

    const oldStatus = order.status;
    order.status = "processing";
    await this.orderRepository.update(order);
    this.logger.debug(`Order status updated`, {
      id: order.id,
      newStatus: order.status,
      oldStatus: oldStatus,
    });

    // check cancel
    if (!certificateEnrollParams.cancel) {
      try {
        const certificate = await this.certificateService.enroll(order, params);

        order.certificate = certificate.thumbprint;
        await this.orderRepository.update(order);
        await this.onEnrollCertificateTask();

        if (order.status === "processing") {
          order.status = "valid";
          await this.orderRepository.update(order);
        }
      } catch (err) {
        // TODO Optimize Error assignment
        await this.createOrderError(
          err instanceof Error
            ? err
            : new Error(`Unknown error '${err}'`),
          order);
      }

      this.logger.debug(`Order status updated`, {
        id: order.id,
        newStatus: order.status,
        oldStatus: oldStatus,
      });
    }

    return order;
  }

  public async getCertificate(accountId: data.Key, thumbprint: string) {
    const certificate = await this.certificateService.getByThumbprint(thumbprint);
    if (certificate.type === "leaf") {
      await this.getByCertificate(accountId, thumbprint);
    }
    return await this.certificateService.getChain(certificate);
  }

  /**
   * Returns Order by thumbprint of certificate
   * @param accountId Account specific id
   * @param thumbprint Thumbprint of certificate
   */
  public async getByCertificate(accountId: data.Key, param: string | ArrayBuffer): Promise<data.IOrder> {
    const thumbprint = typeof param === "string"
      ? param
      : pvtsutils.Convert.ToHex(await this.getHash(param));

    const order = await this.orderRepository.findByThumbprint(thumbprint);
    if (!order) {
      throw new core.MalformedError("Order not found");
    }

    // check access
    if (order.accountId !== accountId) {
      throw new core.MalformedError("Access denied");
    }
    return order;
  }

  public async revokeCertificate(key: data.Key | JsonWebKey, params: protocol.RevokeCertificateParams) {
    if (typeof key === "number" || typeof key === "string") {
      // find order
      const x509 = pvtsutils.Convert.FromBase64Url(params.certificate);
      const order = await this.getByCertificate(key, x509);

      // revoke
      await this.certificateService.revoke(order, params.reason);
    } else {
      // var x509 = new X509Certificate2(Base64Url.Decode(params.certificate));
      throw new core.MalformedError(`Not implemented method`);

      // todo see https://tools.ietf.org/html/rfc8555#section-7.6
      //    The server MUST also consider a revocation request valid if it is
      //       signed with the private key corresponding to the public key in the
      //       certificate.

      //var order = GetByCertificate(accountId, x509);

      //RevokeCertificate(order, params.Reason);
    }
  }

  /**
   * Assign values from Error to Order.Error
   * @param err
   * @param order
   */
  private async createOrderError(err: Error, order: data.IOrder): Promise<void> {
    const er = container.resolve<data.IError>(data.diError);

    order.error = er;
    order.error.detail = err.message;
    // todo need parse
    order.error.type = core.ErrorType.serverInternal;

    const oldStatus = order.status;
    order.status = "invalid";
    await this.orderRepository.update(order);
    this.logger.debug(`Order status updated`, {
      id: order.id,
      newStatus: order.status,
      oldStatus: oldStatus,
    });
  }

  /**
   * Allows add additional task before enroll certificate
   * @param certificateEnrollParams
   */
  protected async onEnrollCertificateBefore(certificateEnrollParams: ICertificateEnrollParams): Promise<ICertificateEnrollParams> {
    return certificateEnrollParams;
  }

  /**
   * Allows add additional enroll certificate task
   * @param certificateEnrollParams
   */
  protected async onEnrollCertificateTask(): Promise<void> {
    // empty
  }

  /**
   * Returns Order from repository.
   * Allows to run additional arguments validations before GetActualCheck calling
   * @param params Params to get Order
   * @param accountId
   */
  protected async onGetActualCheckBefore(params: protocol.OrderCreateParams, accountId: data.Key): Promise<data.IOrder | null> {
    // Gets order from repository
    return await this.lastByIdentifiers(accountId, params.identifiers);
  }

  public async getIdentifiers(order: data.IOrder): Promise<data.IIdentifier[]> {
    const orderAuthzs = await this.orderAuthorizationRepository.findByOrder(order.id);
    if (!orderAuthzs) {
      throw new core.MalformedError(`Order '${order.id}' does not have orderAuthorizations`);
    }
    if (!order.accountId) {
      throw new core.MalformedError(`Order '${order.id}' don't have accountId`);
    }
    const authzs: data.IAuthorization[] = [];
    for (const orderAuthz of orderAuthzs) {
      authzs.push(await this.authorizationService.getById(order.accountId, orderAuthz.authorizationId));
    }
    const identifiers = authzs.map(o => { return { ...o.identifier }; });

    this.logger.debug(`Get order identifiers`, {
      order: order.id,
      identifiers: identifiers.map(o => {
        return {
          type: o.type,
          value: o.value,
        };
      })
    });

    return identifiers;
  }
}
