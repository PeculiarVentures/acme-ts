import { describe, expect, it } from "vitest";
import { BaseClient } from "./base";

describe("BaseClient", () => {
  it("uses the global crypto and fetch by default", () => {
    const client = new BaseClient();
    expect(client.options.crypto).toBe(globalThis.crypto);
    expect(client.options.fetch).toBe(globalThis.fetch);
  });

  it("uses the crypto and fetch from the options", () => {
    const crypto = {} as Crypto;
    const fetch = (() => {}) as unknown as typeof globalThis.fetch;
    const client = new BaseClient({ crypto, fetch });
    expect(client.options.crypto).toBe(crypto);
    expect(client.options.fetch).toBe(fetch);
  });
});
