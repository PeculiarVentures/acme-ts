export interface INonceRepository {
  /**
   * Creates random bytes
   */
  create(): Promise<string>;
  contains(value: string): Promise<boolean>;
  remove(value: string): Promise<void>;
}
