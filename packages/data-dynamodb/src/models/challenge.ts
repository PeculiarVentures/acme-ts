import { IChallenge } from "@peculiar/acme-data";
import { ChallengeStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";

export class Challenge extends BaseObject implements IChallenge {
  public type: string;
  public status: ChallengeStatus;
  public validated?: Date | undefined;
  public errorId: string;
  public token: string;
  public authorizationId: string;

  public constructor(params: Partial<Challenge> = {}) {
    super(params);

    this.type ??= "http-01";
    this.status ??= "pending";
    this.errorId ??= "";
    this.token ??= "";
    this.authorizationId ??= "";
  }

  public async toDynamo(): Promise<void> {
    this.index = `challenge#`;
    this.parentId = this.authorizationId;
  }

  public fromDynamo(data: any): void {
    this.type = data.type;
    this.status = data.status;
    if (data.validated) {
      this.validated = data.validated;
    }
    this.errorId = data.errorId;
    this.token = data.token;
    this.authorizationId = data.authorizationId;
  }
}
