import { IChallenge } from "@peculiar/acme-data";
import { ChallengeStatus } from "@peculiar/acme-protocol";
import { BaseObject, IBaseDynamoObject } from "./base";

export interface IChallengeDynamo extends IBaseDynamoObject {
  type: string;
  status: ChallengeStatus;
  validated?: string;
  errorId: string;
  token: string;
}

export class Challenge extends BaseObject implements IChallenge {
  public type: string;
  public status: ChallengeStatus;
  public validated?: Date;
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

  public async toDynamo() {
    const dynamo: IChallengeDynamo = {
      id: this.id,
      index: `challenge#`,
      parentId: this.authorizationId,
      type: this.type,
      status: this.status,
      errorId: this.errorId,
      token: this.token,
    };
    if (this.validated) {
      dynamo.validated = this.fromDate(this.validated);
    }
    return dynamo;
  }

  public fromDynamo(data: IChallengeDynamo) {
    this.type = data.type;
    this.status = data.status;
    if (data.validated) {
      this.validated = this.toDate(data.validated);
    }
    this.errorId = data.errorId;
    this.token = data.token;
    this.authorizationId = data.parentId;
  }
}
