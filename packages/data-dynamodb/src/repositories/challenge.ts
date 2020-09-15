import { diChallenge, IChallengeRepository, Key } from "@peculiar/acme-data";
import { Challenge } from "../models";
import { BaseRepository } from "./base";

export class ChallengeRepository extends BaseRepository<Challenge> implements IChallengeRepository {

  protected className = diChallenge;

  public async findByAuthorization(authId: Key) {
    return await this.findAllByIndex(authId.toString(),`challenge#`);
  }
}