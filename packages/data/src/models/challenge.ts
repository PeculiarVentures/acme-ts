import { ChallengeStatus } from "@peculiar/acme-protocol";
import { IBaseObject, Key } from "./base";
import { IError } from "./error";

export const diChallenge = "ACME.Models.Challenge";

export interface IChallenge extends IBaseObject {
    /**
     * The type of challenge encoded in the object.
     */
    type: string;

    /**
     * The status of this challenge.
     */
    status: ChallengeStatus;

    /**
     * The time at which the server validated this challenge.
     */
    validated?: Date;

    /**
     * Error that occurred while the server was validating the challenge.
     */
    error?: IError;
    token: string;
    authorizationId: Key;
}
