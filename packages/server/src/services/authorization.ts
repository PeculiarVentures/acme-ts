import { MalformedError, diLogger, ILogger } from "@peculiar/acme-core";
import { Identifier } from "@peculiar/acme-protocol";
import { IIdentifier, IAuthorization, diAuthorizationRepository, IAuthorizationRepository, Key } from "@peculiar/acme-data";
import { injectable, inject } from "tsyringe";
import { BaseService, diServerOptions, IServerOptions } from "./base";
import { IAuthorizationService, diChallengeService, IChallengeService } from "./types";
import * as ModelFabric from "./model_fabric";

@injectable()
export class AuthorizationService extends BaseService implements IAuthorizationService {
  public constructor(
    @inject(diChallengeService) protected challengeService: IChallengeService,
    @inject(diAuthorizationRepository) protected authorizationRepository: IAuthorizationRepository,
    @inject(diLogger) logger: ILogger,
    @inject(diServerOptions) options: IServerOptions) {
    super(options, logger);
  }

  public async getById(accountId: Key, authId: Key): Promise<IAuthorization> {
    const auth = await this.authorizationRepository.findById(authId);

    if (!auth) {
      throw new MalformedError("Authorization doesn't exist");
    }
    if (auth.accountId !== accountId) {
      throw new MalformedError("Access denied");
    }

    const updatedAuth = await this.refreshStatus(auth);
    return updatedAuth;
  }

  public async getActual(accountId: Key, identifier: IIdentifier): Promise<IAuthorization | null> {
    // Get auth from repository
    const auth = await this.authorizationRepository.findByIdentifier(accountId, identifier);
    if (!auth) {
      return null;
    }

    const updatedAuth = await this.refreshStatus(auth);
    return updatedAuth;
  }

  public async create(accountId: Key, identifier: IIdentifier): Promise<IAuthorization> {
    // Create Authorization
    const auth = ModelFabric.authorization();

    // Fill params
    this.onCreateParams(auth, accountId, identifier);

    // Save authorization
    const addedAuth = await this.authorizationRepository.add(auth);

    // Add challenges
    await this.challengeService.create(addedAuth.id, "http-01");
    //const tls = ChallengeService.Create(addedAuth.Id, "tls-01");
    //const dns = ChallengeService.Create(addedAuth.Id, "dns-01");

    this.logger.info(`Authorization ${auth.id} created`);

    return addedAuth;
  }

  public async refreshStatus(item: IAuthorization): Promise<IAuthorization> {
    if (item.status !== "pending" && item.status !== "valid") {
      return item;
    }

    if (item.expires && item.expires < new Date()) {
      // Check Expire
      item.status = "expired";
      await this.authorizationRepository.update(item);
    }
    else {
      // Check status
      const challenges = await this.challengeService.getByAuthorization(item.id);
      if (challenges.find(o => o.status === "valid")) {
        item.status = "valid";
        await this.authorizationRepository.update(item);
      } else if (!challenges.find(o => o.status !== "invalid")) {
        item.status = "invalid";
        await this.authorizationRepository.update(item);
      }
    }
    this.logger.info(`Authorization ${item.id} status updated to ${item.status}`);
    return item;
  }

  /**
   * Fills parameters
   * @param auth
   * @param accountId
   * @param identifier
   */
  protected onCreateParams(auth: IAuthorization, accountId: Key, identifier: Identifier) {
    auth.identifier.type = identifier.type;
    auth.identifier.value = identifier.value;
    auth.accountId = accountId;
    auth.status = "pending";

    if (this.options.expireAuthorizationDays > 0) {
      const date = new Date();
      date.setDate(new Date().getDate() + this.options.expireAuthorizationDays);
      auth.expires = date;
    }
  }

  public async deactivate(id: Key): Promise<IAuthorization> {
    const authz = await this.authorizationRepository.findById(id);

    if (!authz) {
      throw new MalformedError("Authorization doesn't exist");
    }
    if (authz.status !== "pending") {
      throw new MalformedError("Cannot deactivate status cause it's not active")
    }

    authz.status = "deactivated";

    const resp = await this.authorizationRepository.update(authz);

    this.logger.info(`Authorization ${resp.id} deactivated`);

    return resp;
  }
}