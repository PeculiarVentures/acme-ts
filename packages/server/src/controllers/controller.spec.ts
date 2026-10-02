import * as core from "@peculiar/acme-core";
import * as x509 from "@peculiar/x509";
import * as data from "@peculiar/acme-data";
import { IAuthorizationRepository } from "@peculiar/acme-data";
import * as dataMemory from "@peculiar/acme-data-memory";
import * as protocol from "@peculiar/acme-protocol";
import * as server from "@peculiar/acme-server";
import { AsnConvert } from "@peculiar/asn1-schema";
import { GeneralName, id_ce_subjectAltName, SubjectAlternativeName } from "@peculiar/asn1-x509";
import { JsonWebKey, JsonWebSignature } from "@peculiar/jose";
import { Crypto } from "@peculiar/webcrypto";
import { MemoryEndpointService } from "@peculiar/acme-test-server/src/services";
import { Convert } from "pvtsutils";
import { container, Lifecycle } from "tsyringe";
import { afterAll, assert, beforeAll, describe, expect, it } from "vitest";

const baseAddress = "http://localhost";

describe("Server", () => {
  const crypto = new Crypto();
  let controller: server.AcmeController;
  beforeAll(async () => {
    const notAfter = new Date();
    notAfter.setUTCFullYear(notAfter.getUTCFullYear() + 1);

    server.DependencyInjection.register(container, {
      baseAddress,
      debugMode: true,
      downloadCertificateFormat: "pem",
      hashAlgorithm: "SHA-256",
      expireAuthorizationDays: 1,
      ordersPageSize: 10,
      formattedResponse: true,
    });
    container.register(server.diEndpointService, MemoryEndpointService, { lifecycle: Lifecycle.Singleton });
    const logger = new core.ConsoleLogger();
    logger.level = core.LoggerLevel.error;
    container.register(core.diLogger, { useValue: logger });
    dataMemory.DependencyInjection.register(container);
    controller = container.resolve<server.AcmeController>(server.diAcmeController);
  });

  //#region Helpers
  async function getNonce() {
    const nonceResp = await controller.getNonce(
      new server.Request({
        path: `${baseAddress}/new-nonce`,
        method: "HEAD",
      }),
    );
    assert.ok(nonceResp.headers.replayNonce, "replayNonce is required");
    return nonceResp.headers.replayNonce;
  }

  async function generateKey() {
    const alg: RsaHashedKeyGenParams = {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
      publicExponent: new Uint8Array([1, 0, 1]),
      modulusLength: 2048,
    };
    return (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as Required<CryptoKeyPair>;
  }

  async function createPostRequest(params: any, url: string, kid: string, keys: Required<CryptoKeyPair>, queryParams: core.QueryParams = {}) {
    const jws = new JsonWebSignature(
      {
        payload: params,
        protected: {
          nonce: await getNonce(),
          url,
          kid,
          jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
        },
      },
      crypto,
    );
    await jws.sign({ name: "RSASSA-PKCS1-v1_5" }, keys.privateKey);

    return new server.Request({
      path: url,
      method: "POST",
      queryParams,
      body: jws.toJSON(),
    });
  }

  // eslint-disable-next-line @typescript-eslint/member-delimiter-style
  async function createAccount(params: protocol.AccountCreateParams & { keys?: Required<CryptoKeyPair> }, response?: (resp: core.Response) => void) {
    const keys = params.keys || (await generateKey());
    const jws = new JsonWebSignature(
      {
        payload: params,
        protected: {
          nonce: await getNonce(),
          url: `${baseAddress}/new-acct`,
          jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
        },
      },
      crypto,
    );
    await jws.sign({ name: "RSASSA-PKCS1-v1_5" }, keys.privateKey);

    const resp = await controller.newAccount(
      new server.Request({
        path: `${baseAddress}/new-acct`,
        method: "POST",
        body: jws.toJSON(),
      }),
    );

    if (resp.status === core.HttpStatusCode.ok || resp.status === core.HttpStatusCode.created) {
      assert.ok(resp.headers.location, "location header is required");
      expect(resp.headers.location.startsWith(`${baseAddress}/acct/`), "Wrong Account location URL").toBe(true);
    }
    expect(!!resp.headers.replayNonce).toBe(true);

    if (response) {
      response(resp);
    }

    return {
      location: resp.headers.location,
      account: resp.json<protocol.Account>(),
      keys,
    };
  }

  function getId(location: any) {
    expect(location).toBeTruthy();
    expect(typeof location).toBe("string");

    const matches = /([^/]+)$/.exec(location);
    assert.ok(matches);

    return matches[1];
  }
  //#endregion

  it("GET directory", async () => {
    const resp = await controller.getDirectory(
      new server.Request({
        path: `${baseAddress}/directory`,
        method: "GET",
      }),
    );

    expect(resp.status, `Wrong status ${resp.status}. ${resp.content?.toJSON().detail}`).toBe(200);
    expect(resp.content?.type).toBe(core.ContentType.json);

    const json: protocol.Directory = resp.json();
    expect(json.keyChange).toBe(`${baseAddress}/key-change`);
    expect(json.newAccount).toBe(`${baseAddress}/new-acct`);
    expect(json.newAuthz).toBe(`${baseAddress}/new-authz`);
    expect(json.newNonce).toBe(`${baseAddress}/new-nonce`);
    expect(json.newOrder).toBe(`${baseAddress}/new-order`);
    expect(json.revokeCert).toBe(`${baseAddress}/revoke`);
  });

  it("GET new-nonce", async () => {
    const resp = await controller.getNonce(
      new server.Request({
        path: `${baseAddress}/new-nonce`,
        method: "GET",
      }),
    );

    expect(resp.status).toBe(204);

    expect(!!resp.headers.replayNonce).toBe(true);
  });

  it("HEAD new-nonce", async () => {
    const resp = await controller.getNonce(
      new server.Request({
        path: `${baseAddress}/new-nonce`,
        method: "HEAD",
      }),
    );

    expect(resp.status).toBe(200);

    expect(!!resp.headers.replayNonce).toBe(true);
  });

  describe("account", () => {
    describe("new-account", () => {
      it("wrong nonce", async () => {
        const alg: RsaHashedKeyGenParams = {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
          publicExponent: new Uint8Array([1, 0, 1]),
          modulusLength: 2048,
        };
        const keys = (await crypto.subtle.generateKey(alg, false, ["sign", "verify"])) as Required<CryptoKeyPair>;
        const jws = new JsonWebSignature(
          {
            payload: {
              contact: ["mailto:some@mail.com"],
            } as protocol.AccountCreateParams,
            protected: {
              nonce: "1234567890",
            },
          },
          crypto,
        );
        await jws.sign(alg, keys.privateKey);

        const resp = await controller.newAccount(
          new server.Request({
            path: `${baseAddress}/new-acct`,
            method: "POST",
            body: jws.toJSON(),
          }),
        );

        expect(resp.status).toBe(400);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.badNonce);
      });

      it("empty url", async () => {
        const keys = await generateKey();
        const jws = new JsonWebSignature(
          {
            payload: {
              contact: ["mailto:some@mail.com"],
            } as protocol.AccountCreateParams,
            protected: {
              nonce: await getNonce(),
            },
          },
          crypto,
        );
        await jws.sign({ name: "RSASSA-PKCS1-v1_5" }, keys.privateKey);

        const resp = await controller.newAccount(
          new server.Request({
            path: `${baseAddress}/new-acct`,
            method: "POST",
            body: jws.toJSON(),
          }),
        );

        expect(resp.status).toBe(401);
        expect(!!resp.headers.replayNonce).toBe(true);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.unauthorized);
      });

      it("invalid jws signature", async () => {
        const keys = await generateKey();
        const nonce = await getNonce();

        const jws = new JsonWebSignature(
          {
            payload: {
              contact: ["mailto:some@mail.com"],
            } as protocol.AccountCreateParams,
            protected: {
              nonce,
              url: `${baseAddress}/new-acct`,
              jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
            },
          },
          crypto,
        );
        await jws.sign({ name: "RSASSA-PKCS1-v1_5" }, keys.privateKey);
        jws.signature += "a";

        const resp = await controller.newAccount(
          new server.Request({
            path: `${baseAddress}/new-acct`,
            method: "POST",
            body: jws.toJSON(),
          }),
        );

        expect(resp.status).toBe(401);
        expect(!!resp.headers.replayNonce).toBe(true);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.unauthorized);
      });

      it("create with contacts", async () => {
        const client = await createAccount(
          {
            contact: ["mailto:some@mail.com"],
          },
          (resp) => {
            expect(resp.status).toBe(201);
            expect(resp.headers.location).toBeTruthy();
          },
        );

        expect(client.account.contact).toStrictEqual(["mailto:some@mail.com"]);
        expect(client.account.termsOfServiceAgreed).toStrictEqual(undefined);
        expect(client.account.status).toStrictEqual("valid");
        expect(!!client.account.orders).toStrictEqual(true);
      });

      it("create without contacts", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
          expect(resp.headers.location).toBeTruthy();
        });

        expect(client.account.contact).toBe(undefined);
      });

      it("unsupported contact", async () => {
        const client = await createAccount({ contact: ["wrong email address"] }, (resp) => {
          expect(resp.status).toBe(400);

          const json = resp.json<protocol.Error>();
          // If the server rejects a contact URL for using an unsupported scheme,
          // it MUST return an error of type "unsupportedContact"
          expect(json.type).toBe(core.ErrorType.unsupportedContact);
        });

        expect(client.account.contact).toBe(undefined);
      });

      it("incorrect contact", async () => {
        const client = await createAccount({ contact: ["mailto:wrong email address"] }, (resp) => {
          expect(resp.status).toBe(400);

          const json = resp.json<protocol.Error>();
          // If the server rejects a contact URL for using
          // a supported scheme but an invalid value, then the server MUST return
          // an error of type "invalidContact".
          expect(json.type).toBe(core.ErrorType.invalidContact);
        });

        expect(client.account.contact).toBe(undefined);
      });

      it("get nonexisting account onlyReturnExisting:true", async () => {
        await createAccount({ onlyReturnExisting: true }, (resp) => {
          expect(resp.status).toBe(400);

          const json = resp.json<protocol.Error>();
          expect(json.type).toBe(core.ErrorType.accountDoesNotExist);
        });
      });

      it("get existing account onlyReturnExisting:true", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);

          const json = resp.json<protocol.Account>();
          expect(json.status).toBe("valid");
        });

        // Get existing account
        await createAccount({ onlyReturnExisting: true, keys: client.keys }, (resp) => {
          expect(resp.status).toBe(200);

          const json = resp.json<protocol.Account>();
          expect(json.status).toBe("valid");
        });
      });

      it("get existing account onlyReturnExisting:false", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);

          const json = resp.json<protocol.Account>();
          expect(json.status).toBe("valid");
        });

        // Get existing account
        await createAccount({ keys: client.keys }, (resp) => {
          expect(resp.status).toBe(200);

          const json = resp.json<protocol.Account>();
          expect(json.status).toBe("valid");
        });
      });
    });

    describe("terms agreement", () => {
      beforeAll(() => {
        controller.options.meta = { termsOfService: `${baseAddress}/terms.pdf` };
      });

      it("get directory", async () => {
        const resp = await controller.getDirectory(
          new server.Request({
            method: "GET",
            path: `${baseAddress}/directory`,
          }),
        );

        expect(resp.status).toBe(200);

        const json = resp.json<protocol.Directory>();
        assert.ok(json.meta, "Property 'meta' is required in Directory object");
        expect(json.meta.termsOfService).toBeTruthy();
      });

      it("create account without termsOfServiceAgreed", async () => {
        await createAccount({}, (resp) => {
          expect(resp.status).toBe(403);

          const json = resp.json<protocol.Error>();
          expect(json.type).toBe(core.ErrorType.malformed);
        });
      });

      it("create account with termsOfServiceAgreed", async () => {
        await createAccount({ termsOfServiceAgreed: true }, (resp) => {
          expect(resp.status).toBe(201);

          const json = resp.json<protocol.Account>();
          expect(json.termsOfServiceAgreed).toBe(true);
        });
      });

      afterAll(() => {
        delete controller.options.meta;
      });
    });

    describe("POST account", () => {
      it("update contacts", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const resp = await controller.postAccount(
          await createPostRequest(
            {
              contact: ["mailto:some-new@mail.com"],
            } as protocol.AccountUpdateParams,
            client.location!,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(200);

        const json = resp.json<protocol.Account>();
        expect(json.status).toBe("valid");
        expect(json.contact).toStrictEqual(["mailto:some-new@mail.com"]);
      });

      it("remove contacts", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const resp = await controller.postAccount(
          await createPostRequest(
            {
              contact: [],
            } as protocol.AccountUpdateParams,
            client.location!,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(200);

        const json = resp.json<protocol.Account>();
        expect(json.status).toBe("valid");
        expect(json.contact).toStrictEqual([]);
      });

      it("invalid contact", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const resp = await controller.postAccount(
          await createPostRequest(
            {
              contact: ["mailto:wrong email$address_com"],
            } as protocol.AccountUpdateParams,
            client.location!,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(400);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.invalidContact);
      });

      it("unsupported contact", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const resp = await controller.postAccount(
          await createPostRequest(
            {
              contact: ["wrong email$address_com"],
            } as protocol.AccountUpdateParams,
            client.location!,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(400);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.unsupportedContact);
      });

      it("deactivate", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        {
          const resp = await controller.postAccount(
            await createPostRequest(
              {
                status: "deactivated",
              } as protocol.AccountUpdateParams,
              client.location!,
              client.location!,
              client.keys,
            ),
          );

          expect(resp.status).toBe(200);

          const json = resp.json<protocol.Account>();
          expect(json.status).toBe("deactivated");
        }

        {
          // send request to deactivated account
          const resp = await controller.postAccount(await createPostRequest({} as protocol.AccountUpdateParams, client.location!, client.location!, client.keys));

          expect(resp.status).toBe(401);

          const json = resp.json<protocol.Error>();
          expect(json.type).toBe(core.ErrorType.unauthorized);
        }
      });
    });

    describe("key rollover", () => {
      async function createNewKey(oldKey: CryptoKey, kid: string, keys?: Required<CryptoKeyPair>) {
        keys ??= await generateKey();
        const innerToken = new JsonWebSignature(
          {
            protected: {
              url: `${baseAddress}/key-change`,
              jwk: new JsonWebKey(crypto, await crypto.subtle.exportKey("jwk", keys.publicKey)),
            },
            payload: {
              account: kid,
              oldKey: new JsonWebKey(crypto, await crypto.subtle.exportKey("jwk", oldKey)),
            },
          },
          crypto,
        );
        await innerToken.sign({ hash: "SHA-256", ...keys.privateKey.algorithm }, keys.privateKey);
        return innerToken;
      }

      it("success", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        const resp = await controller.keyChange(await createPostRequest(innerToken.toJSON(), `${baseAddress}/key-change`, client.location!, client.keys));

        expect(resp.status).toBe(200);
        expect(resp.headers.location).toBe(client.location);

        const json = resp.json<protocol.Account>();
        expect(json.status).toBe("valid");
      });

      it("conflict", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const client2 = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!, client2.keys);
        const resp = await controller.keyChange(await createPostRequest(innerToken.toJSON(), `${baseAddress}/key-change`, client.location!, client.keys));

        expect(resp.status).toBe(409);
        expect(resp.headers.location).toBe(client2.location);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.malformed);
      });

      it("inner token must have JWK", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        const header = innerToken.getProtected();
        delete header.jwk;
        innerToken.setProtected(header);
        const resp = await controller.keyChange(await createPostRequest(innerToken.toJSON(), `${baseAddress}/key-change`, client.location!, client.keys));

        expect(resp.status).toBe(403);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.malformed);
      });

      it("inner token must have JWK", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        const header = innerToken.getProtected();
        delete header.jwk;
        innerToken.setProtected(header);
        const resp = await controller.keyChange(await createPostRequest(innerToken.toJSON(), `${baseAddress}/key-change`, client.location!, client.keys));

        expect(resp.status).toBe(403);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.malformed);
      });

      it("inner token invalid signature", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        innerToken.signature = "wrongSignatureValue";
        const resp = await controller.keyChange(await createPostRequest(innerToken.toJSON(), `${baseAddress}/key-change`, client.location!, client.keys));

        expect(resp.status).toBe(403);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.malformed);
      });

      it("inner token invalid signature", async () => {
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        innerToken.signature = "wrongSignatureValue";
        const resp = await controller.keyChange(await createPostRequest(innerToken.toJSON(), `${baseAddress}/key-change`, client.location!, client.keys));

        expect(resp.status).toBe(403);

        const json = resp.json<protocol.Error>();
        expect(json.type).toBe(core.ErrorType.malformed);
      });
    });
  });

  describe("order", async () => {
    async function changeAuthzStatus(location: string, status: protocol.AuthorizationStatus) {
      const authzRepo = container.resolve<data.IAuthorizationRepository>(data.diAuthorizationRepository);
      const authz = await authzRepo.findById(getId(location));
      assert.ok(authz);
      authz.status = status;
      authzRepo.update(authz);
    }

    describe("create", () => {
      it("create", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [
                {
                  type: "dns",
                  value: "some.com",
                },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);
        expect(/http:\/\/localhost\/order\/[^/]/.test(resp.headers.location!), "Order response wrong Location header").toBe(true);

        const json = resp.json<protocol.Order>();
        expect(json.status).toBe("pending");
        expect(/http:\/\/localhost\/finalize\/[^/]/.test(json.finalize), "Order response wrong 'finalize' value").toBe(true);
        expect(/http:\/\/localhost\/authz\/[^/]/.test(json.authorizations[0]), "Order response wrong authorizations link").toBe(true);
        expect(json.identifiers).toStrictEqual([{ type: "dns", value: "some.com" }]);
      });

      it("create if already exists", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [
                {
                  type: "dns",
                  value: "some.com",
                },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);

        const resp2 = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [
                {
                  type: "dns",
                  value: "some.com",
                },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        // Server must create new order
        expect(resp2.status).toBe(201);
        expect(resp.headers.location).not.toBe(resp2.headers.location);
      });

      it("create if already exists and valid", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [
                {
                  type: "dns",
                  value: "some.com",
                },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);

        // Change status of order
        const orderRepo = container.resolve<data.IOrderRepository>(data.diOrderRepository);
        const order = await orderRepo.findById(getId(resp.headers.location));
        assert.ok(order);
        order.status = "valid";
        orderRepo.update(order);

        const resp2 = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [
                {
                  type: "dns",
                  value: "some.com",
                },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp2.status).toBe(201);
      });

      it("create if authz has valid status", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [
                {
                  type: "dns",
                  value: "some.com",
                },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);

        // Change status of order
        const orderRepo = container.resolve<data.IOrderRepository>(data.diOrderRepository);
        const order = await orderRepo.findById(getId(resp.headers.location));
        assert.ok(order);
        order.status = "valid";
        orderRepo.update(order);

        // Change status of authz
        const authzRepo = container.resolve<data.IAuthorizationRepository>(data.diAuthorizationRepository);
        const jsonOrder = resp.json<protocol.Order>();
        const authz = await authzRepo.findById(getId(jsonOrder.authorizations[0]));
        assert.ok(authz);
        authz.status = "valid";
        authzRepo.update(authz);

        const resp2 = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [
                {
                  type: "dns",
                  value: "some.com",
                },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp2.status).toBe(201);

        const json = resp2.json<protocol.Order>();
        expect(json.authorizations[0]).toBe(jsonOrder.authorizations[0]);
        expect(json.status).toBe("ready");
      });

      it("incorrect identifier type", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [{ type: "wrong", value: "some.com" }],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(403);

        const error = resp.json<protocol.Error>();
        expect(error.type).toBe(core.ErrorType.unsupportedIdentifier);
      });

      it("incorrect identifier value", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [{ type: "dns", value: "wrong domain name" }],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(403);

        const error = resp.json<protocol.Error>();
        expect(error.type).toBe(core.ErrorType.malformed);
      });
    });

    describe("get", () => {
      describe("status", () => {
        it("authz: valid, valid ", async () => {
          // Create new account
          const client = await createAccount({}, (resp) => {
            expect(resp.status).toBe(201);
          });

          const resp = await controller.createOrder(
            await createPostRequest(
              {
                identifiers: [
                  { type: "dns", value: "some.com" },
                  { type: "dns", value: "some2.com" },
                ],
              } as protocol.OrderCreateParams,
              `${baseAddress}/new-order`,
              client.location!,
              client.keys,
            ),
          );

          expect(resp.status).toBe(201);
          const id = getId(resp.headers.location);

          const order = resp.json<protocol.Order>();
          expect(order.status).toBe("pending");

          changeAuthzStatus(order.authorizations[0], "valid");
          changeAuthzStatus(order.authorizations[1], "valid");

          const resp2 = await controller.postOrder(await createPostRequest("", `${baseAddress}/order/${id}`, client.location!, client.keys), id);
          expect(resp2.status).toBe(200);

          const order2 = resp2.json<protocol.Order>();
          expect(order2.status).toBe("ready");
        });

        it("authz: valid, pending ", async () => {
          // Create new account
          const client = await createAccount({}, (resp) => {
            expect(resp.status).toBe(201);
          });

          const resp = await controller.createOrder(
            await createPostRequest(
              {
                identifiers: [
                  { type: "dns", value: "some.com" },
                  { type: "dns", value: "some2.com" },
                ],
              } as protocol.OrderCreateParams,
              `${baseAddress}/new-order`,
              client.location!,
              client.keys,
            ),
          );

          expect(resp.status).toBe(201);
          const id = getId(resp.headers.location);

          const order = resp.json<protocol.Order>();
          expect(order.status).toBe("pending");

          changeAuthzStatus(order.authorizations[0], "valid");

          const resp2 = await controller.postOrder(await createPostRequest("", `${baseAddress}/order/${id}`, client.location!, client.keys), id);
          expect(resp2.status).toBe(200);

          const order2 = resp2.json<protocol.Order>();
          expect(order2.status).toBe("pending");
        });

        it("authz: valid, invalid ", async () => {
          // Create new account
          const client = await createAccount({}, (resp) => {
            expect(resp.status).toBe(201);
          });

          const resp = await controller.createOrder(
            await createPostRequest(
              {
                identifiers: [
                  { type: "dns", value: "some.com" },
                  { type: "dns", value: "some2.com" },
                ],
              } as protocol.OrderCreateParams,
              `${baseAddress}/new-order`,
              client.location!,
              client.keys,
            ),
          );

          expect(resp.status).toBe(201);
          const id = getId(resp.headers.location);

          const order = resp.json<protocol.Order>();
          expect(order.status).toBe("pending");

          changeAuthzStatus(order.authorizations[0], "valid");
          changeAuthzStatus(order.authorizations[1], "invalid");

          const resp2 = await controller.postOrder(await createPostRequest("", `${baseAddress}/order/${id}`, client.location!, client.keys), id);
          expect(resp2.status).toBe(200);

          const order2 = resp2.json<protocol.Order>();
          expect(order2.status).toBe("invalid");
          expect(order2.error).toBeTruthy();
        });
      });
    });

    describe("finalize", () => {
      it("wrong CSR message", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        // create order
        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [{ type: "dns", value: "some.com" }],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);
        const order = resp.json<protocol.Order>();
        const orderId = getId(resp.headers.location);

        await changeAuthzStatus(order.authorizations[0], "valid");

        const resp2 = await controller.finalizeOrder(
          await createPostRequest(
            {
              csr: "AaAaAaAaAaAaAaAaAaAaAaAa",
            } as protocol.FinalizeParams,
            `${baseAddress}/finalize/${orderId}`,
            client.location!,
            client.keys,
          ),
          orderId,
        );

        expect(resp2.status).toBe(403);
        const error = resp2.json<protocol.Error>();
        expect(error.type).toBe(core.ErrorType.badCSR);
      });

      it("CSR doesn't have required identifiers", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        // create order
        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [
                { type: "dns", value: "some.com" },
                { type: "dns", value: "some2.com" },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);
        const order = resp.json<protocol.Order>();
        const orderId = getId(resp.headers.location);

        await changeAuthzStatus(order.authorizations[0], "valid");
        await changeAuthzStatus(order.authorizations[1], "valid");

        const resp2 = await controller.finalizeOrder(
          await createPostRequest(
            {
              csr: "MIICRzCCAS8CAQAwAjEAMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArut7tLrb1BEHXImMTWipet+3/J2isn7mBv278oP7YyOkmX/Vzxvk9nvSc/B1wh6kSo6nfaxYacNNSP3r+WQYaTeLm5TsDbUfCJYtvvTuYH0GVTM8Qm7QhMZKnyUy/D60WNcRM4pnBDSEMpKppi7HhfL37DZpQnsQfr9r8LQPWZ9t/mf+FsSeWyQOQcz+ob6cODfNQIvbzpaXXdNpKIHLPW+/e4af5/WlZ9wL5Sy7kOf4X6nErdl74s1vSji9goANSQkd5TbswtFPRNybikrrisz0HtsIq2uTGDY6t3iOEHTe5qe/ux4anjbSqKVuIQEQWQOKb4h+mHTc+EC5yknihQIDAQABoAAwDQYJKoZIhvcNAQELBQADggEBAE7TU20ui1MLtxLM0UZMytYAjC7vtXxB5Vl6bzHUzZkVFW6oTeizqDxjeBtZ1SqErpgdyvzMvFSxF6f+679kl1/Zs2V0IPa4y58he3wTT/M1xCBN/bITY2cA4ETozbtK4cGoi6jY/0j8NcxTLfiBgwhE3ap+9GzLtWEhHWCXmpsohbvAktXSh1tLh4xmgoQoePEBSPbnaOmsonyzscKiBMASDvjrFdNbtD0uY2v/wYXwtRGvV/Q/O3lLWEosE4NdnZmgId4bm7ru48WucSnxuEJAkKUjDLrN0uqY/tKfX4Zy9w8Y/o+hk3QzNBVa3ZUvzDhVAmamQflvw3lXMm/JG4U=",
            } as protocol.FinalizeParams,
            `${baseAddress}/finalize/${orderId}`,
            client.location!,
            client.keys,
          ),
          orderId,
        );

        expect(resp2.status).toBe(403);
        const error = resp2.json<protocol.Error>();
        expect(error.type).toBe(core.ErrorType.badCSR);
        assert.ok(error.subproblems);
        expect(error.subproblems.length).toBe(2);
      });

      it("CSR with multiple DNS", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        // create order
        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [
                { type: "dns", value: "some.com" },
                { type: "dns", value: "info.some.com" },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);
        const order = resp.json<protocol.Order>();
        const orderId = getId(resp.headers.location);

        await changeAuthzStatus(order.authorizations[0], "valid");
        await changeAuthzStatus(order.authorizations[1], "valid");

        const keyAlg: RsaHashedKeyGenParams = {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
          publicExponent: new Uint8Array([1, 0, 1]),
          modulusLength: 2048,
        };
        const keys = (await crypto.subtle.generateKey(keyAlg, false, ["sign", "verify"])) as CryptoKeyPair;
        const req = await x509.Pkcs10CertificateRequestGenerator.create({
          name: "CN=some.com",
          keys,
          signingAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
          extensions: [
            new x509.Extension(
              id_ce_subjectAltName,
              false,
              AsnConvert.serialize(new SubjectAlternativeName([new GeneralName({ dNSName: "info.some.com" }), new GeneralName({ dNSName: "*.some.com" })])),
            ),
          ],
        });
        const resp2 = await controller.finalizeOrder(
          await createPostRequest(
            {
              csr: Convert.ToBase64Url(req.rawData),
            } as protocol.FinalizeParams,
            `${baseAddress}/finalize/${orderId}`,
            client.location!,
            client.keys,
          ),
          orderId,
        );

        expect(resp2.status).toBe(403);
        const error = resp2.json<protocol.Error>();
        expect(error.type).toBe(core.ErrorType.badCSR);
        assert.ok(error.subproblems);
        expect(error.subproblems.length).toBe(2);
      });
    });

    describe("list", () => {
      it("pagination", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        async function createOrder(dns: string, status: protocol.OrderStatus = "pending") {
          const resp = await controller.createOrder(
            await createPostRequest(
              {
                identifiers: [{ type: "dns", value: dns }],
              } as protocol.OrderCreateParams,
              `${baseAddress}/new-order`,
              client.location!,
              client.keys,
            ),
          );
          expect(resp.status).toBe(201);

          const id = getId(resp.headers.location);

          if (status !== "pending") {
            const orderRepo = container.resolve<data.IOrderRepository>(data.diOrderRepository);
            const order = await orderRepo.findById(id);
            assert.ok(order);

            order.status = status;

            await orderRepo.update(order);
          }

          return id;
        }

        const id01 = await createOrder("some1.com");
        const id02 = await createOrder("some2.com", "valid");
        const id03 = await createOrder("some3.com", "processing");
        const id04 = await createOrder("some4.com", "ready");
        await createOrder("some5.com", "invalid");
        const id06 = await createOrder("some6.com");
        const id07 = await createOrder("some7.com");
        const id08 = await createOrder("some8.com");
        const id09 = await createOrder("some9.com");
        const id10 = await createOrder("some10.com");
        const id11 = await createOrder("some11.com");
        const id12 = await createOrder("some12.com");
        const id13 = await createOrder("some13.com");
        const id14 = await createOrder("some14.com");
        const id15 = await createOrder("some15.com");
        const id16 = await createOrder("some16.com");
        const id17 = await createOrder("some17.com");
        const id18 = await createOrder("some18.com");
        const id19 = await createOrder("some19.com");
        const id20 = await createOrder("some20.com");
        const id21 = await createOrder("some21.com");
        const id22 = await createOrder("some22.com");
        const id23 = await createOrder("some23.com");

        const resp = await controller.postOrders(await createPostRequest("", `${baseAddress}/orders`, client.location!, client.keys));
        expect(resp.status).toBe(200);

        if (resp.headers.link) {
          expect(resp.json()).toStrictEqual({
            orders: [
              `${baseAddress}/order/${id01}`,
              `${baseAddress}/order/${id02}`,
              `${baseAddress}/order/${id03}`,
              `${baseAddress}/order/${id04}`,
              `${baseAddress}/order/${id06}`,
              `${baseAddress}/order/${id07}`,
              `${baseAddress}/order/${id08}`,
              `${baseAddress}/order/${id09}`,
              `${baseAddress}/order/${id10}`,
              `${baseAddress}/order/${id11}`,
            ],
          });
          expect(resp.headers.link).toStrictEqual([`<${baseAddress}/orders?cursor=1>;rel="next"`]);

          const resp2 = await controller.postOrders(await createPostRequest("", `${baseAddress}/orders?cursor=1`, client.location!, client.keys, { cursor: ["1"] }));
          expect(resp2.status).toBe(200);
          expect(resp2.headers.link).toStrictEqual([`<${baseAddress}/orders?cursor=0>;rel="previous"`, `<${baseAddress}/orders?cursor=2>;rel="next"`]);
          expect(resp2.json()).toStrictEqual({
            orders: [
              `${baseAddress}/order/${id12}`,
              `${baseAddress}/order/${id13}`,
              `${baseAddress}/order/${id14}`,
              `${baseAddress}/order/${id15}`,
              `${baseAddress}/order/${id16}`,
              `${baseAddress}/order/${id17}`,
              `${baseAddress}/order/${id18}`,
              `${baseAddress}/order/${id19}`,
              `${baseAddress}/order/${id20}`,
              `${baseAddress}/order/${id21}`,
            ],
          });
        } else {
          const j = resp.json();
          // assert.deepStrictEqual(j, {});
          const ar = [
            `${baseAddress}/order/${id01}`,
            `${baseAddress}/order/${id02}`,
            `${baseAddress}/order/${id03}`,
            `${baseAddress}/order/${id04}`,
            `${baseAddress}/order/${id06}`,
            `${baseAddress}/order/${id07}`,
            `${baseAddress}/order/${id08}`,
            `${baseAddress}/order/${id09}`,
            `${baseAddress}/order/${id10}`,
            `${baseAddress}/order/${id11}`,
            `${baseAddress}/order/${id12}`,
            `${baseAddress}/order/${id13}`,
            `${baseAddress}/order/${id14}`,
            `${baseAddress}/order/${id15}`,
            `${baseAddress}/order/${id16}`,
            `${baseAddress}/order/${id17}`,
            `${baseAddress}/order/${id18}`,
            `${baseAddress}/order/${id19}`,
            `${baseAddress}/order/${id20}`,
            `${baseAddress}/order/${id21}`,
            `${baseAddress}/order/${id22}`,
            `${baseAddress}/order/${id23}`,
          ];
          expect(j.orders.length).toBe(ar.length);
          j.orders.forEach((order: string) => {
            expect(ar.find((o) => o === order)).toBeTruthy();
          });
        }
      });
    });
  });

  describe("authorization", () => {
    it("create new", async () => {
      // Create new account
      const client = await createAccount({}, (resp) => {
        expect(resp.status).toBe(201);
      });

      const resp = await controller.createAuthorization(
        await createPostRequest(
          {
            identifier: { type: "dns", value: "some.com" },
          } as protocol.AuthorizationCreateParams,
          `${baseAddress}/new-authz`,
          client.location!,
          client.keys,
        ),
      );

      expect(resp.status).toBe(201);
      expect(/http:\/\/localhost\/authz\/[^/]/.test(resp.headers.location!), "Authorization response wrong Location header").toBe(true);

      const json = resp.json<protocol.Authorization>();
      expect(json.status).toBe("pending");
      expect(json.identifier).toStrictEqual({ type: "dns", value: "some.com" });
      expect(json.challenges.length).toStrictEqual(1);
    });

    describe("status", () => {
      async function changeChallengeStatus(location: string, status: protocol.ChallengeStatus) {
        const challengeRepo = container.resolve<data.IChallengeRepository>(data.diChallengeRepository);
        const challenge = await challengeRepo.findById(getId(location));
        assert.ok(challenge);
        challenge.status = status;
        challengeRepo.update(challenge);
      }

      async function testAuthzStatus(challengeStatus: protocol.ChallengeStatus, authzStatus: protocol.AuthorizationStatus) {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await controller.createAuthorization(
          await createPostRequest(
            {
              identifier: { type: "dns", value: "some.com" },
            } as protocol.AuthorizationCreateParams,
            `${baseAddress}/new-authz`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);

        const authz = resp.json<protocol.Authorization>();
        const authzId = getId(resp.headers.location);
        await changeChallengeStatus(authz.challenges[0].url, challengeStatus);

        const resp2 = await controller.postAuthorization(await createPostRequest({} as protocol.AuthorizationCreateParams, `${baseAddress}/authz/${authzId}`, client.location!, client.keys), authzId);

        expect(resp2.status).toBe(200);

        const authz2 = resp2.json<protocol.Authorization>();
        expect(authz2.status).toBe(authzStatus);
      }

      it("valid", async () => {
        await testAuthzStatus("valid", "valid");
      });

      it("invalid", async () => {
        await testAuthzStatus("invalid", "invalid");
      });

      it("pending", async () => {
        await testAuthzStatus("pending", "pending");
      });

      it("expired", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await controller.createAuthorization(
          await createPostRequest(
            {
              identifier: { type: "dns", value: "some.com" },
            } as protocol.AuthorizationCreateParams,
            `${baseAddress}/new-authz`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);

        const authzId = getId(resp.headers.location);

        // Update expiration time
        const authzRepo = container.resolve<IAuthorizationRepository>(data.diAuthorizationRepository);
        const authzItem = await authzRepo.findById(authzId);
        assert.ok(authzItem);
        authzItem.expires = new Date("2019/01/01");
        await authzRepo.update(authzItem);

        const resp2 = await controller.postAuthorization(await createPostRequest({} as protocol.AuthorizationCreateParams, `${baseAddress}/authz/${authzId}`, client.location!, client.keys), authzId);

        expect(resp2.status).toBe(200);

        const authz = resp2.json<protocol.Authorization>();
        expect(authz.status).toBe("expired");
      });
    });

    describe("POST authz", () => {
      it("deactivate", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [{ type: "dns", value: "some.com" }],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);
        assert.ok(resp.headers.location);

        const order = resp.json<protocol.Order>();
        const orderId = getId(resp.headers.location);
        const authzLocation = order.authorizations[0];
        const authzId = getId(authzLocation);

        const resp2 = await controller.postAuthorization(
          await createPostRequest(
            {
              status: "deactivated",
            } as protocol.AuthorizationUpdateParams,
            authzLocation,
            client.location!,
            client.keys,
          ),
          authzId,
        );

        expect(resp2.status).toBe(200);

        const authz = resp2.json<protocol.Authorization>();
        expect(authz.status).toBe("deactivated");

        // validate order status
        const resp3 = await controller.postOrder(await createPostRequest({}, resp.headers.location, client.location!, client.keys), orderId);

        expect(resp.status).toBe(201);

        const order2 = resp3.json<protocol.Order>();
        expect(order2.status).toBe("invalid");
      });

      it("deactivate inactive authz", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        // create order
        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [{ type: "dns", value: "some.com" }],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp.status).toBe(201);
        expect(resp.headers.location).toBeTruthy();

        const order = resp.json<protocol.Order>();
        const authzLocation = order.authorizations[0];
        const authzId = getId(authzLocation);

        // deactivate authz
        const resp2 = await controller.postAuthorization(
          await createPostRequest(
            {
              status: "deactivated",
            } as protocol.AuthorizationUpdateParams,
            authzLocation,
            client.location!,
            client.keys,
          ),
          authzId,
        );

        expect(resp2.status).toBe(200);

        // deactivate authz again
        const resp3 = await controller.postAuthorization(
          await createPostRequest(
            {
              status: "deactivated",
            } as protocol.AuthorizationUpdateParams,
            authzLocation,
            client.location!,
            client.keys,
          ),
          authzId,
        );

        expect(resp3.status).toBe(403);

        const error = resp3.json<protocol.Error>();
        expect(error.type).toBe(core.ErrorType.malformed);
      });
    });
  });

  describe("certificate", () => {
    async function changeAuthzStatus(location: string, status: protocol.AuthorizationStatus) {
      const authzRepo = container.resolve<data.IAuthorizationRepository>(data.diAuthorizationRepository);
      const authz = await authzRepo.findById(getId(location));
      assert.ok(authz);
      authz.status = status;
      authzRepo.update(authz);
    }

    describe("revoke", () => {
      beforeAll(() => {
        controller.options.downloadCertificateFormat = "pkix";
      });
      afterAll(() => {
        controller.options.downloadCertificateFormat = "pem";
      });

      async function enrollCertificate(client: any) {
        // create order
        const resp = await controller.createOrder(
          await createPostRequest(
            {
              identifiers: [{ type: "dns", value: "some.com" }],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys,
          ),
        );

        const order = resp.json<protocol.Order>();
        const orderId = getId(resp.headers.location);

        await changeAuthzStatus(order.authorizations[0], "valid");

        const keyAlg: RsaHashedKeyGenParams = {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
          publicExponent: new Uint8Array([1, 0, 1]),
          modulusLength: 2048,
        };
        const keys = (await crypto.subtle.generateKey(keyAlg, false, ["sign", "verify"])) as CryptoKeyPair;
        const req = await x509.Pkcs10CertificateRequestGenerator.create({
          name: "DC=some.com",
          keys,
          signingAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
          extensions: [new x509.Extension(id_ce_subjectAltName, false, AsnConvert.serialize(new SubjectAlternativeName([new GeneralName({ dNSName: "some.com" })])))],
        });
        const resp2 = await controller.finalizeOrder(
          await createPostRequest(
            {
              csr: Convert.ToBase64Url(req.rawData),
            } as protocol.FinalizeParams,
            `${baseAddress}/finalize/${orderId}`,
            client.location!,
            client.keys,
          ),
          orderId,
        );
        const order2 = resp2.json<protocol.Order>();

        assert.ok(order2.certificate);
        const thumbprint = getId(order2.certificate);
        const resp3 = await controller.getCertificate(
          await createPostRequest(
            {
              csr: Convert.ToBase64Url(req.rawData),
            } as protocol.FinalizeParams,
            order2.certificate,
            client.location!,
            client.keys,
          ),
          thumbprint,
        );
        return resp3;
      }

      it("success", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await enrollCertificate(client);

        const cert = resp.content!.content;
        expect(cert).toBeTruthy();

        const resp2 = await controller.revokeCertificate(
          await createPostRequest(
            {
              certificate: Convert.ToBase64Url(cert),
              reason: 0,
            },
            `${baseAddress}/revoke`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp2.status).toBe(204);
      });

      it("revoke without reason", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await enrollCertificate(client);

        const cert = resp.content!.content;
        expect(cert).toBeTruthy();

        const resp2 = await controller.revokeCertificate(
          await createPostRequest(
            {
              certificate: Convert.ToBase64Url(cert),
            },
            `${baseAddress}/revoke`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp2.status).toBe(204);
      });

      it("Error: already revoked", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await enrollCertificate(client);

        const cert = resp.content!.content;
        expect(cert).toBeTruthy();

        const resp2 = await controller.revokeCertificate(
          await createPostRequest(
            {
              certificate: Convert.ToBase64Url(cert),
            },
            `${baseAddress}/revoke`,
            client.location!,
            client.keys,
          ),
        );
        expect(resp2.status).toBe(204);

        const resp3 = await controller.revokeCertificate(
          await createPostRequest(
            {
              certificate: Convert.ToBase64Url(cert),
            },
            `${baseAddress}/revoke`,
            client.location!,
            client.keys,
          ),
        );

        expect(resp3.status).toBe(400);
        const error = resp3.json<protocol.Error>();
        expect(error.type).toBe(core.ErrorType.alreadyRevoked);
      });

      it("Error: access denied", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });
        // Create new account
        const client2 = await createAccount({}, (resp) => {
          expect(resp.status).toBe(201);
        });

        const resp = await enrollCertificate(client);

        const cert = resp.content!.content;
        expect(cert).toBeTruthy();

        const resp2 = await controller.revokeCertificate(
          await createPostRequest(
            {
              certificate: Convert.ToBase64Url(cert),
            },
            `${baseAddress}/revoke`,
            client.location!,
            client2.keys,
          ),
        );

        expect(resp2.status).toBe(401);
        const error = resp2.json<protocol.Error>();
        expect(error.type).toBe(core.ErrorType.unauthorized);
      });
    });
  });
});
