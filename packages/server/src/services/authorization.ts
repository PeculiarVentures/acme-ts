import { HttpStatusCode, MalformedError } from "@peculiar/acme-core";
import { Identifier } from "@peculiar/acme-protocol";
import * as acmeData from "@peculiar/acme-data";
import { injectable, container } from "tsyringe";
import { BaseService } from "./base";
import { IAuthorizationService, diChallengeService, IChallengeService } from "./types";

@injectable()
export class AuthorizationService extends BaseService implements IAuthorizationService {

  protected challengeService = container.resolve<IChallengeService>(diChallengeService);
  protected authorizationRepository = container.resolve<acmeData.IAuthorizationRepository>(acmeData.diAuthorizationRepository);

  public async getById(accountId: acmeData.Key, authId: acmeData.Key): Promise<acmeData.IAuthorization> {
    const authz = await this.authorizationRepository.findById(authId);

    if (!authz) {
      throw new MalformedError(`Authorization id:'${authId}' doesn't exist`);
    }

    if (authz.accountId !== accountId) {
      throw new MalformedError("Access denied");
    }

    this.logger.debug("Get authorization by id", {
      authorization: {
        id: authz.id,
        status: authz.status,
      }
    });

    const updatedAuth = await this.refreshStatus(authz);
    return updatedAuth;
  }

  public async getActual(accountId: acmeData.Key, identifier: acmeData.IIdentifier): Promise<acmeData.IAuthorization | null> {
    // Get auth from repository
    const auth = await this.authorizationRepository.findByIdentifier(accountId, identifier);
    if (auth) {
      const updatedAuth = await this.refreshStatus(auth);
      if (updatedAuth.status === "pending" || updatedAuth.status === "valid") {
        this.logger.debug(`Actual authorization`, {
          account: {
            id: accountId,
          },
          authorization: {
            id: updatedAuth.id,
            status: updatedAuth.status,
          }
        });

        return updatedAuth;
      }
    }

    this.logger.debug(`Actual authorization not found`, {
      account: {
        id: accountId,
      }
    });

    return null;
  }

  public async create(accountId: acmeData.Key, identifier: acmeData.IIdentifier): Promise<acmeData.IAuthorization> {
    // Create Authorization
    const authz = container.resolve<acmeData.IAuthorization>(acmeData.diAuthorization);

    await this.challengeService.identifierValidate(identifier);

    // Fill params
    await this.onCreateParams(authz, accountId, identifier);
    // Save authorization
    const addedAuth = await this.authorizationRepository.add(authz);
    try {
      await this.challengeService.create(authz, identifier.type);

      this.logger.debug(`Authorization created`, {
        account: authz.accountId,
        id: authz.id,
        identifier: {
          type: authz.identifier.type,
          value: authz.identifier.value,
        },
      });

      return addedAuth;
    } catch (error) {
      addedAuth.status = "invalid";
      await this.authorizationRepository.update(addedAuth);

      this.logger.debug(`Authorization status updated to 'invalid'`, {
        id: authz.id,
      });

      if (error instanceof Error) {
        throw new MalformedError("Cannot create challenges", HttpStatusCode.forbidden, error);
      }
      throw new MalformedError("Cannot create challenges");
    }
  }

  public async refreshStatus(item: acmeData.IAuthorization): Promise<acmeData.IAuthorization> {
    if (item.status !== "pending" && item.status !== "valid") {
      return item;
    }

    const oldStatus = item.status;

    if (item.expires && item.expires < new Date()) {
      // Check Expire
      item.status = "expired";
      await this.authorizationRepository.update(item);
    } else {
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

    if (oldStatus !== item.status) {
      this.logger.debug(`Authorization status changed`, {
        account: item.accountId,
        id: item.id,
        newStatus: item.status,
        oldStatus: oldStatus,
      });
    }

    return item;
  }

  /**
   * Fills parameters
   * @param auth
   * @param accountId
   * @param identifier
   */
  protected async onCreateParams(auth: acmeData.IAuthorization, accountId: acmeData.Key, identifier: Identifier) {
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

  public async deactivate(id: acmeData.Key): Promise<acmeData.IAuthorization> {
    const authz = await this.authorizationRepository.findById(id);

    if (!authz) {
      throw new MalformedError("Authorization doesn't exist");
    }
    if (authz.status !== "pending") {
      throw new MalformedError("Cannot deactivate status cause it's not active");
    }

    authz.status = "deactivated";

    const resp = await this.authorizationRepository.update(authz);

    this.logger.debug(`Authorization deactivated`, {
      account: authz.accountId,
      id,
    });

    return resp;
  }
}
