import { Error } from "./error";

export type ChallengeStatus = "pending" | "processing" | "valid" | "invalid";

export interface Challenge {
  /**
   * The type of challenge encoded in the object.
   */
  type: string;

  /**
   * The URL to which a response can be posted.
   */
  url: string;

  /**
   * The status of this challenge.
   */
  status: ChallengeStatus;

  /**
   * The time at which the server validated this challenge.
   */
  validated?: string;

  /**
   * Error that occurred while the server was validating the challenge.
   */
  error?: Error;

  /**
   * A random value that uniquely identifies the challenge.
   */
  token: string;
}
