import { IChallenge, IError } from "@peculiar/acme-data";
import { ChallengeStatus } from "@peculiar/acme-protocol";
import { BaseObject, IBaseDynamoObject } from "./base";

export interface IChallengeDynamo extends IBaseDynamoObject {
  type: string;
  status: ChallengeStatus;
  validated?: string;
  error?: IError;
  token: string;
}

export class Challenge extends BaseObject implements IChallenge {
  public type: string;
  public status: ChallengeStatus;
  public validated?: Date;
  public error?: IError;
  public token: string;
  public authorizationId: string;

  public constructor(params: Partial<Challenge> = {}) {
    super(params);

    this.type ??= "http-01";
    this.status ??= "pending";
    this.error;
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
      error: this.error,
      token: this.token,
    };
    if (this.error) {
      dynamo.error = this.error;
    }
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
    if (data.error) {
      this.error = data.error;
    }
    this.token = data.token;
    this.authorizationId = data.parentId;
  }
}
