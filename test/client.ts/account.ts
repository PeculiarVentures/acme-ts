import * as assert from "assert";
import { ApiClient } from "@peculiar/acme-client";
import { preparation, checkHeaders, checkResAccount } from "./bootstrap";
import { AcmeError, ErrorType } from "@peculiar/acme-core";
import { Crypto } from "@peculiar/webcrypto";
import { cryptoProvider } from "@peculiar/acme-core";

context("Account Management", () => {

  let testClient: ApiClient;

  before(async () => {
    const prep = await preparation();
    testClient = prep.client;
  });

  it("Error: no agreement to the terms", async () => {
    await assert.rejects(testClient.createAccount({
      contact: ["mailto:microshine@mail.ru"],
      termsOfServiceAgreed: false,
    }), (err: AcmeError) => {
      assert.equal(err.status, 400);
      assert.equal(err.type, ErrorType.malformed);
      return true;
    });
  });

  it("Error: find not exist account", async () => {
    await assert.rejects(testClient.createAccount({
      contact: ["mailto:microshine@mail.ru"],
      onlyReturnExisting: true,
    }), (err: AcmeError) => {
      assert.equal(err.status, 400);
      assert.equal(err.type, ErrorType.accountDoesNotExist);
      return true;
    });
  });

  it("Error: create account with unsupported contact", async () => {
    await assert.rejects(testClient.createAccount({
      contact: ["mailt:microshine@mail.ru"],
      termsOfServiceAgreed: true,
    }), (err: AcmeError) => {
      assert.equal(err.status, 400);
      return true;
    });
  });

  it("Error: create account with invalid contact", async () => {
    await assert.rejects(testClient.createAccount({
      contact: ["mailto:microshine"],
      termsOfServiceAgreed: true,
    }), (err: AcmeError) => {
      assert.equal(err.status, 400);
      return true;
    });
  });

  it("create account", async () => {
    const res = await testClient.createAccount({
      contact: ["mailto:microshine@mail.ru"],
      termsOfServiceAgreed: true,
    });
    checkHeaders(res);
    checkResAccount(res, 201);
  });

  it("create account with the same key", async () => {
    const res = await testClient.createAccount({
      contact: ["mailto:microshine2@mail.ru"],
      termsOfServiceAgreed: true,
    });
    checkHeaders(res);
    checkResAccount(res, 200);
  });

  it("finding an account", async () => {
    const res = await testClient.createAccount({ onlyReturnExisting: true });
    checkHeaders(res);
    checkResAccount(res, 200);
  });

  it("update account", async () => {
    const res = await testClient.updateAccount({ contact: ["mailto:testmail@mail.ru"] });
    assert.equal(!!res.headers.link, true);
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

    const newKey = await crypto.subtle.generateKey(alg, true, ["sign", "verify"]);
    const res = await testClient.changeKey(newKey);
    assert.equal(!!res.headers.link, true);
    checkResAccount(res, 200);
  });

  it("deactivate account", async () => {
    const res = await testClient.deactivateAccount();
    assert.equal(!!res.headers.link, true);
    assert.equal(res.status, 200);
  });

  it("Error: account with the provided public key exists but is deactivated", async () => {
    await assert.rejects(testClient.createAccount({
      contact: ["mailto:microshine@mail.ru"],
      termsOfServiceAgreed: true,
    }), (err: AcmeError) => {
      assert.equal(err.status, 403);
      assert.equal(err.type, ErrorType.unauthorized);
      return true;
    });
  });

});