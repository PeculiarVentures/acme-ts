import { IBaseRepository } from "./base";
import { IChallenge, Key } from "../models";

export const diChallengeRepository = "ACME.ChallengeRepository";

export interface IChallengeRepository extends IBaseRepository<IChallenge> {
  findByAuthorization(authzId: Key): Promise<IChallenge[]>;
}
