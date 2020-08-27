import { ContentType, ErrorType, Request, Response } from "@peculiar/acme-core";
import * as dataMemory from "@peculiar/acme-data-memory";
import * as protocol from "@peculiar/acme-protocol";
import { AcmeController, diAcmeController, DependencyInjection } from "@peculiar/acme-server";
import { JsonWebSignature } from "@peculiar/jose";
import { Crypto } from "@peculiar/webcrypto";
import * as assert from "assert";
import { container } from "tsyringe";

const baseAddress = "http://localhost";

context.only("Server", () => {

  const crypto = new Crypto();

  dataMemory.DependencyInjection.register(container);
  DependencyInjection.register(container, {
    baseAddress,
    cryptoProvider: crypto,

    debugMode: true,
    downloadCertificateFormat: "PemCertificateChain",
    hashAlgorithm: "SHA-256",
    expireAuthorizationDays: 1,
    levelLogger: "error",
    ordersPageSize: 10,
    formattedResponse: true,
  });
  const controller = container.resolve<AcmeController>(diAcmeController);

  //#region Helpers
  async function getNonce() {
    const nonceResp = await controller.getNonce(new Request({
      path: `${baseAddress}/new-nonce`,
      method: "HEAD",
    }));
    assert(nonceResp.headers.replayNonce, "replayNonce is required");
    return nonceResp.headers.replayNonce;
  }

  async function generateKey() {
    const alg: RsaHashedKeyGenParams = {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
      publicExponent: new Uint8Array([1, 0, 1]),
      modulusLength: 2048,
    };
    return await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;
  }

  // eslint-disable-next-line @typescript-eslint/member-delimiter-style
  async function createAccount(params: protocol.AccountCreateParams & { keys?: CryptoKeyPair; }, response?: (resp: Response) => void) {
    const keys = params.keys || await generateKey();
    const jws = new JsonWebSignature({
      payload: params,
      protected: {
        nonce: await getNonce(),
        url: `${baseAddress}/new-acct`,
        jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
      }
    }, crypto);
    await jws.sign({ name: "RSASSA-PKCS1-v1_5" }, keys.privateKey);

    const resp = await controller.newAccount(new Request({
      path: `${baseAddress}/new-acct`,
      method: "POST",
      body: jws.toJSON(),
    }));

    if (resp.status === 200 || resp.status === 201) {
      assert(resp.headers.location, "location header is required");
      // todo: uncomment
      // assert.strictEqual(resp.headers.location.startsWith(`${baseAddress}/acct/`), true, "Wrong Account location URL");
    }
    assert.strictEqual(!!resp.headers.replayNonce, true);

    if (response) {
      response(resp);
    }

    return {
      location: resp.headers.location,
      account: resp.json<protocol.Account>(),
      keys,
    };
  }
  //#endregion

  it("GET directory", async () => {
    const resp = await controller.getDirectory(new Request({
      path: `${baseAddress}/directory`,
      method: "GET",
    }));

    assert.strictEqual(resp.status, 200);
    assert.strictEqual(resp.content?.type, ContentType.json);

    const json: protocol.Directory = resp.json();
    assert.strictEqual(json.keyChange, `${baseAddress}/key-change`);
    assert.strictEqual(json.newAccount, `${baseAddress}/new-acct`);
    assert.strictEqual(json.newAuth, `${baseAddress}/new-authz`);
    assert.strictEqual(json.newNonce, `${baseAddress}/new-nonce`);
    assert.strictEqual(json.newOrder, `${baseAddress}/new-order`);
    assert.strictEqual(json.revokeCert, `${baseAddress}/revoke`);
  });

  it("GET new-nonce", async () => {
    const resp = await controller.getNonce(new Request({
      path: `${baseAddress}/new-nonce`,
      method: "GET",
    }));

    assert.strictEqual(resp.status, 204);

    assert.strictEqual(!!resp.headers.replayNonce, true);
  });

  it("HEAD new-nonce", async () => {
    const resp = await controller.getNonce(new Request({
      path: `${baseAddress}/new-nonce`,
      method: "HEAD",
    }));

    assert.strictEqual(resp.status, 200);

    assert.strictEqual(!!resp.headers.replayNonce, true);
  });

  context("new-account", () => {

    it("wrong nonce", async () => {
      const alg: RsaHashedKeyGenParams = {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
        publicExponent: new Uint8Array([1, 0, 1]),
        modulusLength: 2048,
      };
      const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;
      const jws = new JsonWebSignature({
        payload: {
          contact: ["mailto:some@mail.com"],
        } as protocol.AccountCreateParams,
        protected: {
          nonce: "1234567890",
        }
      }, crypto);
      await jws.sign(alg, keys.privateKey);

      const resp = await controller.newAccount(new Request({
        path: `${baseAddress}/new-acct`,
        method: "POST",
        body: jws.toJSON(),
      }));

      assert.strictEqual(resp.status, 400);

      const json = resp.json<protocol.Error>();
      assert.strictEqual(json.type, ErrorType.badNonce);
    });

    it("empty url", async () => {
      const keys = await generateKey();
      const jws = new JsonWebSignature({
        payload: {
          contact: ["mailto:some@mail.com"],
        } as protocol.AccountCreateParams,
        protected: {
          nonce: await getNonce(),
        }
      }, crypto);
      await jws.sign({ name: "RSASSA-PKCS1-v1_5" }, keys.privateKey);

      const resp = await controller.newAccount(new Request({
        path: `${baseAddress}/new-acct`,
        method: "POST",
        body: jws.toJSON(),
      }));

      assert.strictEqual(resp.status, 401);
      assert.strictEqual(!!resp.headers.replayNonce, true);

      const json = resp.json<protocol.Error>();
      assert.strictEqual(json.type, ErrorType.unauthorized);
    });

    it("invalid jws signature", async () => {
      const keys = await generateKey();
      const nonce = await getNonce();

      const jws = new JsonWebSignature({
        payload: {
          contact: ["mailto:some@mail.com"],
        } as protocol.AccountCreateParams,
        protected: {
          nonce,
          url: `${baseAddress}/new-acct`,
          jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
        }
      }, crypto);
      await jws.sign({ name: "RSASSA-PKCS1-v1_5" }, keys.privateKey);
      jws.signature += "a";

      const resp = await controller.newAccount(new Request({
        path: `${baseAddress}/new-acct`,
        method: "POST",
        body: jws.toJSON(),
      }));

      assert.strictEqual(resp.status, 401);
      assert.strictEqual(!!resp.headers.replayNonce, true);

      const json = resp.json<protocol.Error>();
      assert.strictEqual(json.type, ErrorType.unauthorized);
    });

    it("create with contacts", async () => {
      const client = await createAccount({
        contact: ["mailto:some@mail.com"],
      }, (resp) => {
        assert.strictEqual(resp.status, 201);
        assert(resp.headers.location);
      });

      assert.deepStrictEqual(client.account.contact, ["mailto:some@mail.com"]);
      assert.deepStrictEqual(client.account.status, "valid");
      assert.deepStrictEqual(!!client.account.orders, true);
    });

    it("create without contacts", async () => {
      const client = await createAccount({}, (resp) => {
        assert.strictEqual(resp.status, 201);
        assert(resp.headers.location);
      });

      assert.strictEqual(client.account.contact, undefined);
    });

    it("wrong contact scheme", async () => {
      const client = await createAccount({ contact: ["wrong email address"] }, (resp) => {
        assert.strictEqual(resp.status, 400);

        const json = resp.json<protocol.Error>();
        // If the server rejects a contact URL for using an unsupported scheme,
        // it MUST return an error of type "unsupportedContact"
        assert.strictEqual(json.type, ErrorType.unsupportedContact);
      });

      assert.strictEqual(client.account.contact, undefined);
    });

    it("wrong contact format", async () => {
      const client = await createAccount({ contact: ["mailto:wrong email address"] }, (resp) => {
        assert.strictEqual(resp.status, 400);

        const json = resp.json<protocol.Error>();
        // If the server rejects a contact URL for using
        // a supported scheme but an invalid value, then the server MUST return
        // an error of type "invalidContact".
        assert.strictEqual(json.type, ErrorType.invalidContact);
      });

      assert.strictEqual(client.account.contact, undefined);
    });

    it("get nonexisting account onlyReturnExisting:true", async () => {
      await createAccount({ onlyReturnExisting: true }, (resp) => {
        assert.strictEqual(resp.status, 400);

        const json = resp.json<protocol.Error>();
        assert.strictEqual(json.type, ErrorType.accountDoesNotExist);
      });
    });

    it("get existing account onlyReturnExisting:true", async () => {
      // Create new account
      const client = await createAccount({}, (resp) => {
        assert.strictEqual(resp.status, 201);

        const json = resp.json<protocol.Account>();
        assert.strictEqual(json.status, "valid");
      });

      // Get existing account
      await createAccount({ onlyReturnExisting: true, keys: client.keys }, (resp) => {
        assert.strictEqual(resp.status, 200);

        const json = resp.json<protocol.Account>();
        assert.strictEqual(json.status, "valid");
      });

    });

    it("get existing account onlyReturnExisting:false", async () => {
      // Create new account
      const client = await createAccount({}, (resp) => {
        assert.strictEqual(resp.status, 201);

        const json = resp.json<protocol.Account>();
        assert.strictEqual(json.status, "valid");
      });

      // Get existing account
      await createAccount({ keys: client.keys }, (resp) => {
        assert.strictEqual(resp.status, 200);

        const json = resp.json<protocol.Account>();
        assert.strictEqual(json.status, "valid");
      });

    });

  });

  context("terms agreement", () => {

    before(() => {
      controller.options.termsOfService = `${baseAddress}/terms.pdf`;
    });

    it("get directory", async () => {
      const resp = await controller.getDirectory(new Request({
        method: "GET",
        path: `${baseAddress}/directory`,
      }));

      assert.strictEqual(resp.status, 200);

      const json = resp.json<protocol.Directory>();
      assert(json.meta, "Property 'meta' is required in Directory object");
      assert(json.meta.termsOfService);
    });

    it("create account without termsOfServiceAgreed", async () => {
      await createAccount({}, (resp) => {
        assert.strictEqual(resp.status, 400);

        const json = resp.json<protocol.Error>();
        assert.strictEqual(json.type, ErrorType.malformed);
      });
    });

    it("create account with termsOfServiceAgreed", async () => {
      await createAccount({ termsOfServiceAgreed: true }, (resp) => {
        assert.strictEqual(resp.status, 201);

        const json = resp.json<protocol.Account>();
        assert.strictEqual(json.termsOfServiceAgreed, true);
      });
    });

    after(() => {
      delete controller.options.termsOfService;
    });

  });

});
