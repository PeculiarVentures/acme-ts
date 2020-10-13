import { MalformedError } from "@peculiar/acme-core";
import { Identifier } from "@peculiar/acme-protocol";
import { IIdentifier, IAuthorization, diAuthorizationRepository, IAuthorizationRepository, Key } from "@peculiar/acme-data";
import { injectable, container } from "tsyringe";
import { BaseService } from "./base";
import { IAuthorizationService, diChallengeService, IChallengeService } from "./types";
import * as ModelFabric from "./model_fabric";

@injectable()
export class AuthorizationService extends BaseService implements IAuthorizationService {

  protected challengeService  = container.resolve<IChallengeService>(diChallengeService);
  protected authorizationRepository = container.resolve<IAuthorizationRepository>(diAuthorizationRepository);

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

    await this.challengeService.identifierValidate(identifier);

    // Fill params
    await this.onCreateParams(auth, accountId, identifier);
    // Save authorization
    const addedAuth = await this.authorizationRepository.add(auth);
    try {
      await this.challengeService.create(auth, identifier.type);
      this.logger.info(`Authorization ${auth.id} created`);
      return addedAuth;
    } catch (error) {
      addedAuth.status = "invalid";
      await this.authorizationRepository.update(addedAuth);
      this.logger.info(`Authorization '${auth.id}' status updated to 'invalid'`);
      this.logger.error("Error create challenges", error);
      throw new MalformedError("Cannot create challenges");
    }
  }

  public async refreshStatus(item: IAuthorization): Promise<IAuthorization> {
    if (item.status !== "pending" && item.status !== "valid") {
      return item;
    }

    const oldStatus = item.status;

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
    if(oldStatus !== item.status){
      this.logger.info(`Authorization ${item.id} status updated to ${item.status}`);
    }
    return item;
  }

  /**
   * Fills parameters
   * @param auth
   * @param accountId
   * @param identifier
   */
  protected async onCreateParams(auth: IAuthorization, accountId: Key, identifier: Identifier) {
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
      throw new MalformedError("Cannot deactivate status cause it's not active");
    }

    authz.status = "deactivated";

    const resp = await this.authorizationRepository.update(authz);

    this.logger.info(`Authorization ${resp.id} deactivated`);

    return resp;
  }
}
