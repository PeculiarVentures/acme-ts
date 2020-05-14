
export const diNonceRepository = "ACME.NonceRepository";

/**
 * ACME Nonce repository
 *
 * DI: ACME.NonceRepository
 */
export interface INonceRepository {
  /**
   * Creates random bytes
   */
  create(): Promise<string>;
  contains(value: string): Promise<boolean>;
  remove(value: string): Promise<void>;
}
