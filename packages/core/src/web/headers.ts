export interface ContentTypeHeader {
  mediaType: string;
  charset?: string;
  boundary?: string;
}

export class Headers extends Map<string, string> {

  /**
   * Gets Location header
   */
  public get location() {
    return this.get("location") || null;
  }

  /**
   * Gets Content-Type header
   */
  public get contentType() {
    const header = this.get("content-type");
    if (header) {
      return {
        mediaType: header.split(";")[0],
        charset: /charset=([\w-]+)/i.exec(header)?.[1],
        boundary: /boundary=([\w-]+)/i.exec(header)?.[1],
      } as ContentTypeHeader;
    }
    return null;
  }

  /**
   * Gets Link header
   */
  public get link() {
    const header = this.get("link");
    if (header) {
      return header.split(",").map(o => o.trim());
    }
    return null;
  }

  /**
   * Gets Replay-Nonce header
   */
  public get replayNonce() {
    return this.get("replay-nonce") || null;
  }

  /**
   * Sets header. If header already exists it replaces it
   * @param key Header name
   * @param value Header value
   */
  public set(key: string, value: string) {
    return super.set(key.toLowerCase(), value);
  }

  /**
   * Returns header string value by name
   * @param key Header name
   */
  public get(key: string) {
    return super.get(key.toLowerCase());
  }

  /**
   * Appends value to header
   * @param key Header name
   * @param value Header value
   */
  public append(key: string, value: string): void {
    const prev = this.get(key);
    if (value) {
      this.set(key, `${prev}, ${value}`);
    } else {
      this.set(key, value);
    }
  }

}