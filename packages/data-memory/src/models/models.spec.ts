import { describe, expect, it } from "vitest";
import { Account, Order } from ".";

describe("Data Memory Models", () => {
  // BaseObject assigns the constructor params; fields declared without an
  // initializer in a subclass must not reset them afterwards.
  it("keeps constructor params for fields without initializers", () => {
    const expires = new Date(0);
    const order = new Order({ id: 3, expires, accountId: 7, certificate: "cert" });
    expect(order.id).toBe(3);
    expect(order.expires).toBe(expires);
    expect(order.accountId).toBe(7);
    expect(order.certificate).toBe("cert");

    const account = new Account({ externalAccountId: 5, thumbprint: "abc" });
    expect(account.externalAccountId).toBe(5);
    expect(account.thumbprint).toBe("abc");
  });
});
