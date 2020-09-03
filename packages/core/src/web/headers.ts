export interface ContentTypeHeader {
  mediaType: string;
  charset?: string;
  boundary?: string;
}

export class Headers extends Map<string, string> {

  public static REPLAY_NONCE = "Replay-Nonce";
  public static LINK = "Link";
  public static CONTENT_TYPE = "Content-Type";
  public static LOCATION = "Location";

  /**
   * Gets Location header
   */
  public get location() {
    return this.get(Headers.LOCATION) || null;
  }
  public set location(value: string | null) {
    if (!value) {
      this.delete(Headers.LOCATION);
    } else {
      this.set(Headers.LOCATION, value);
    }
  }

  /**
   * Gets Content-Type header
   */
  public get contentType() {
    const header = this.get(Headers.CONTENT_TYPE);
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
    const header = this.get(Headers.LINK);
    if (header) {
      return header.split(",").map(o => o.trim());
    }
    return null;
  }

  public setLink(value: string) {
    let link = this.get(Headers.LINK);
    if (link) {
      link += `,${value}`;
    } else {
      link = value;
    }
    this.set(Headers.LINK, link);
  }

  /**
   * Gets Replay-Nonce header
   */
  public get replayNonce() {
    return this.get(Headers.REPLAY_NONCE) || null;
  }
  public set replayNonce(value: string | null) {
    if (!value) {
      this.delete(Headers.REPLAY_NONCE);
    } else {
      this.set(Headers.REPLAY_NONCE, value);
    }
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