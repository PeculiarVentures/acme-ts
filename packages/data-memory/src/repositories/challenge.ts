import { IChallenge, IChallengeRepository } from "@peculiar/acme-data";
import { BaseRepository } from "./base";

export class ChallengeRepository extends BaseRepository<IChallenge> implements IChallengeRepository {
  public async findByAuthorization(authId: number) {
    return this.items.filter(o => o.authorizationId === authId);
  }
}