export interface Token {
  protected: Base64UrlString;
  payload: Base64UrlString;
  signature: Base64UrlString;
}

export type Base64UrlString = string;
