import { IChallenge, IError } from "@peculiar/acme-data";
import { ChallengeStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";

export class Challenge extends BaseObject implements IChallenge {
  public type = "http-01";
  public status: ChallengeStatus = "pending";
  public validated?: Date | undefined;
  public error?: IError;
  public token = "";
  public authorizationId = 0;

  public constructor(params: Partial<Challenge> = {}) {
    super(params);
  }
}
