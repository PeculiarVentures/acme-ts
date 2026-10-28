import type { IBaseRepository } from "./base";
import type { IChallenge, Key } from "../models";

export const diChallengeRepository = "ACME.ChallengeRepository";

export interface IChallengeRepository extends IBaseRepository<IChallenge> {
  findByAuthorization(authId: Key): Promise<IChallenge[]>;
}
