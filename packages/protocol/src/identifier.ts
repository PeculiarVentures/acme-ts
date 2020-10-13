/**
 * JSON ACME Identifier object
 */
export interface Identifier {
  /**
   * The type of identifier.
   */
  type: string;

  /**
   * The identifier itself.
   */
  value: string;
}
