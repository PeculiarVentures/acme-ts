import * as assert from "assert";
import { createClient, checkHeaders, checkResAccount, ClientResult } from "./bootstrap";
import { AcmeError, ErrorType } from "@peculiar/acme-core";
import { Crypto } from "@peculiar/webcrypto";
import { cryptoProvider } from "@peculiar/acme-core";

context("Account Management", () => {
  context("new account", () => {

    let client: ClientResult;

    const contactErrors = [
      "urn:ietf:params:acme:error:invalidEmail", // Let's Encrypt
      "urn:ietf:params:acme:error:unsupportedContact" // RFC8555
    ];

    function assertUnsupportedContact(error: AcmeError) {
      assert.strictEqual(contactErrors.includes(error.type), true, `ACME error has got wrong type '${error.type}. Must be one of [${contactErrors.join(", ")}]`);
      assert.strictEqual(error.status, 400);
      return true;
    }

    beforeEach(async () => {
      client = await createClient();
    });

    it("Error: no agreement to the terms", async function () {
      const directory = await client.api.initialize();
      if (!directory.meta?.termsOfService) {
        // If ACME server doesn't have directory.meta.termsOfService we don't need to send
        // `termsOfServiceAgreed` in create account request
        return this.skip();
      }
      await assert.rejects(client.api.newAccount({
        contact: ["mailto:microshine@mail.ru"],
        termsOfServiceAgreed: false,
      }), (err: AcmeError) => {
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.type, ErrorType.malformed);
        return true;
      });
    });

    it("Error: find not exist account", async () => {
      await assert.rejects(client.api.newAccount({
        contact: ["mailto:microshine@mail.ru"],
        onlyReturnExisting: true,
      }), (err: AcmeError) => {
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.type, ErrorType.accountDoesNotExist);
        return true;
      });
    });

    it("Error: create account with unsupported contact", async () => {
      await assert.rejects(client.api.newAccount({
        contact: ["mailt:microshine@mail.ru"],
        termsOfServiceAgreed: true,
      }), assertUnsupportedContact);
    });

    it("Error: create account with invalid contact", async () => {
      await assert.rejects(client.api.newAccount({
        contact: ["mailto:micro shine"],
        termsOfServiceAgreed: true,
      }), assertUnsupportedContact);
    });

    it("create account without email", async () => {
      const res = await client.api.newAccount({
        termsOfServiceAgreed: true,
      });
      checkHeaders(res);
      checkResAccount(res, 201);
    });

    it("create account with email", async () => {
      const res = await client.api.newAccount({
        contact: ["mailto:microshine@mail.ru"],
        termsOfServiceAgreed: true,
      });
      checkHeaders(res);
      checkResAccount(res, 201);
    });

  });
  context("existing account", () => {

    let client: ClientResult;

    before(async () => {
      client = await createClient(true);
    });

    it("create account with the same key", async () => {
      const res = await client.api.newAccount({
        contact: ["mailto:microshine2@mail.ru"],
        termsOfServiceAgreed: true,
      });
      checkHeaders(res);
      checkResAccount(res, 200);
    });

    it("finding an account", async () => {
      const res = await client.api.newAccount({ onlyReturnExisting: true });
      checkHeaders(res);
      checkResAccount(res, 200);
    });

    it("update account", async () => {
      const res = await client.api.updateAccount({ contact: ["mailto:testmail@mail.ru"] });
      assert.strictEqual(!!res.headers.link, true);
      checkResAccount(res, 200);
    });

    it("account key rollover", async () => {
      const alg: RsaHashedKeyGenParams = {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
        publicExponent: new Uint8Array([1, 0, 1]),
        modulusLength: 2048,
      };

      const crypto = new Crypto();
      cryptoProvider.set(crypto);

      const newKey = (await crypto.subtle.generateKey(alg, true, ["sign", "verify"])) as CryptoKeyPair;
      const res = await client.api.changeKey(newKey);
      assert.strictEqual(!!res.headers.link, true);
      checkResAccount(res, 200);
    });

    it("deactivate account", async () => {
      const res = await client.api.deactivateAccount();
      assert.strictEqual(!!res.headers.link, true);
      assert.strictEqual(res.status, 200);

      await assert.rejects(client.api.newAccount({
        termsOfServiceAgreed: true,
      }), (err: AcmeError) => {
        assert.strictEqual([
          403, // Let's Encrypt
          401, // RFC8555
        ].includes(err.status), true, "Error status doesn't match to requirements");
        assert.strictEqual(err.type, ErrorType.unauthorized);
        return true;
      });
    });
  });
});
