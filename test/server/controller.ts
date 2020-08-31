import { ContentType, ErrorType, Request, Response } from "@peculiar/acme-core";
import * as data from "@peculiar/acme-data";
import * as dataMemory from "@peculiar/acme-data-memory";
import * as protocol from "@peculiar/acme-protocol";
import { AcmeController, diAcmeController, DependencyInjection } from "@peculiar/acme-server";
import { JsonWebKey, JsonWebSignature } from "@peculiar/jose";
import { Crypto } from "@peculiar/webcrypto";
import * as assert from "assert";
import { container } from "tsyringe";

const baseAddress = "http://localhost";

context.only("Server", () => {

  const crypto = new Crypto();

  DependencyInjection.register(container, {
    baseAddress,

    debugMode: true,
    downloadCertificateFormat: "PemCertificateChain",
    hashAlgorithm: "SHA-256",
    expireAuthorizationDays: 1,
    levelLogger: "error",
    ordersPageSize: 10,
    formattedResponse: true,
  });
  dataMemory.DependencyInjection.register(container);
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

  async function createPostRequest(params: any, url: string, kid: string, keys: CryptoKeyPair) {
    const jws = new JsonWebSignature({
      payload: params,
      protected: {
        nonce: await getNonce(),
        url,
        kid,
        jwk: await crypto.subtle.exportKey("jwk", keys.publicKey),
      }
    }, crypto);
    await jws.sign({ name: "RSASSA-PKCS1-v1_5" }, keys.privateKey);

    return new Request({
      path: url,
      method: "POST",
      body: jws.toJSON(),
    });
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
      assert.strictEqual(resp.headers.location.startsWith(`${baseAddress}/acct/`), true, "Wrong Account location URL");
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

  function getId(location: any) {
    assert(location);
    assert.strictEqual(typeof location, "string");

    const matches = /([^/]+)$/.exec(location);
    assert(matches);

    return matches[1];
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

  context("account", () => {

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
        assert.deepStrictEqual(client.account.termsOfServiceAgreed, undefined);
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

      it("unsupported contact", async () => {
        const client = await createAccount({ contact: ["wrong email address"] }, (resp) => {
          assert.strictEqual(resp.status, 400);

          const json = resp.json<protocol.Error>();
          // If the server rejects a contact URL for using an unsupported scheme,
          // it MUST return an error of type "unsupportedContact"
          assert.strictEqual(json.type, ErrorType.unsupportedContact);
        });

        assert.strictEqual(client.account.contact, undefined);
      });

      it("incorrect contact", async () => {
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
        controller.options.meta = { termsOfService: `${baseAddress}/terms.pdf` };
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
          assert.strictEqual(resp.status, 403);

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
        delete controller.options.meta;
      });

    });

    context("POST account", () => {

      it("update contacts", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const resp = await controller.postAccount(await createPostRequest(
          {
            contact: ["mailto:some-new@mail.com"],
          } as protocol.AccountUpdateParams,
          client.location!,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 200);

        const json = resp.json<protocol.Account>();
        assert.strictEqual(json.status, "valid");
        assert.deepStrictEqual(json.contact, ["mailto:some-new@mail.com"]);
      });

      it("remove contacts", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const resp = await controller.postAccount(await createPostRequest(
          {
            contact: [],
          } as protocol.AccountUpdateParams,
          client.location!,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 200);

        const json = resp.json<protocol.Account>();
        assert.strictEqual(json.status, "valid");
        assert.deepStrictEqual(json.contact, []);
      });

      it("invalid contact", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const resp = await controller.postAccount(await createPostRequest(
          {
            contact: ["mailto:wrong email$address_com"],
          } as protocol.AccountUpdateParams,
          client.location!,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 400);

        const json = resp.json<protocol.Error>();
        assert.strictEqual(json.type, ErrorType.invalidContact);
      });

      it("unsupported contact", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const resp = await controller.postAccount(await createPostRequest(
          {
            contact: ["wrong email$address_com"],
          } as protocol.AccountUpdateParams,
          client.location!,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 400);

        const json = resp.json<protocol.Error>();
        assert.strictEqual(json.type, ErrorType.unsupportedContact);
      });

      it("deactivate", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        {
          const resp = await controller.postAccount(await createPostRequest(
            {
              status: "deactivated",
            } as protocol.AccountUpdateParams,
            client.location!,
            client.location!,
            client.keys,
          ));

          assert.strictEqual(resp.status, 200);

          const json = resp.json<protocol.Account>();
          assert.strictEqual(json.status, "deactivated");
        }

        {
          // send request to deactivated account
          const resp = await controller.postAccount(await createPostRequest(
            {} as protocol.AccountUpdateParams,
            client.location!,
            client.location!,
            client.keys,
          ));

          assert.strictEqual(resp.status, 401);

          const json = resp.json<protocol.Error>();
          assert.strictEqual(json.type, ErrorType.unauthorized);
        }
      });

    });

    context("key rollover", () => {

      async function createNewKey(oldKey: CryptoKey, kid: string, keys?: CryptoKeyPair) {
        keys ??= await generateKey();
        const innerToken = new JsonWebSignature({
          protected: {
            url: `${baseAddress}/key-change`,
            jwk: new JsonWebKey(crypto, await crypto.subtle.exportKey("jwk", keys.publicKey)),
          },
          payload: {
            account: kid,
            oldKey: new JsonWebKey(crypto, await crypto.subtle.exportKey("jwk", oldKey)),
          }
        }, crypto);
        await innerToken.sign({ hash: "SHA-256", ...keys.privateKey.algorithm }, keys.privateKey);
        return innerToken;
      }

      it("success", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        const resp = await controller.keyChange(await createPostRequest(
          innerToken.toJSON(),
          `${baseAddress}/key-change`,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 200);
        assert.strictEqual(resp.headers.location, client.location);

        const json = resp.json<protocol.Account>();
        assert.strictEqual(json.status, "valid");
      });

      it("conflict", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const client2 = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!, client2.keys);
        const resp = await controller.keyChange(await createPostRequest(
          innerToken.toJSON(),
          `${baseAddress}/key-change`,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 409);
        assert.strictEqual(resp.headers.location, client2.location);

        const json = resp.json<protocol.Error>();
        assert.strictEqual(json.type, ErrorType.malformed);
      });

      it("inner token must have JWK", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        const header = innerToken.getProtected();
        delete header.jwk;
        innerToken.setProtected(header);
        const resp = await controller.keyChange(await createPostRequest(
          innerToken.toJSON(),
          `${baseAddress}/key-change`,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 403);

        const json = resp.json<protocol.Error>();
        assert.strictEqual(json.type, ErrorType.malformed);
      });

      it("inner token must have JWK", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        const header = innerToken.getProtected();
        delete header.jwk;
        innerToken.setProtected(header);
        const resp = await controller.keyChange(await createPostRequest(
          innerToken.toJSON(),
          `${baseAddress}/key-change`,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 403);

        const json = resp.json<protocol.Error>();
        assert.strictEqual(json.type, ErrorType.malformed);
      });

      it("inner token invalid signature", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        innerToken.signature = "wrongSignatureValue";
        const resp = await controller.keyChange(await createPostRequest(
          innerToken.toJSON(),
          `${baseAddress}/key-change`,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 403);

        const json = resp.json<protocol.Error>();
        assert.strictEqual(json.type, ErrorType.malformed);
      });

      it("inner token invalid signature", async () => {
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });
        const innerToken = await createNewKey(client.keys.publicKey, client.location!);
        innerToken.signature = "wrongSignatureValue";
        const resp = await controller.keyChange(await createPostRequest(
          innerToken.toJSON(),
          `${baseAddress}/key-change`,
          client.location!,
          client.keys,
        ));

        assert.strictEqual(resp.status, 403);

        const json = resp.json<protocol.Error>();
        assert.strictEqual(json.type, ErrorType.malformed);
      });

    });

  });

  context("order", async () => {

    context("create", () => {

      it("create", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              {
                type: "dns",
                value: "some.com"
              }
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);
        assert.strictEqual(/http:\/\/localhost\/order\/\d+/.test(resp.headers.location!), true, "Order response wrong Location header");

        const json = resp.json<protocol.Order>();
        assert.strictEqual(json.status, "pending");
        assert.strictEqual(/http:\/\/localhost\/finalize\/\d+/.test(json.finalize), true, "Order response wrong 'finalize' value");
        assert.strictEqual(/http:\/\/localhost\/authz\/\d+/.test(json.authorizations[0]), true, "Order response wrong authorizations link");
        assert.deepStrictEqual(json.identifiers, [{ type: "dns", value: "some.com" }]);
      });

      it("create if already exists", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              {
                type: "dns",
                value: "some.com"
              }
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);

        const resp2 = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              {
                type: "dns",
                value: "some.com"
              }
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp2.status, 200);
        assert.strictEqual(resp.headers.location, resp2.headers.location);
      });

      it("create if already exists, another order of identifiers", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              {
                type: "dns",
                value: "some.com"
              },
              {
                type: "dns",
                value: "some2.com"
              },
              {
                type: "dns",
                value: "some3.com"
              }
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);

        const resp2 = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              {
                type: "dns",
                value: "some2.com"
              },
              {
                type: "dns",
                value: "some3.com"
              },
              {
                type: "dns",
                value: "some.com"
              }
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp2.status, 200);
        assert.strictEqual(resp.headers.location, resp2.headers.location);
      });

      it("create if already exists and valid", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              {
                type: "dns",
                value: "some.com"
              }
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);

        // Change status of order
        const orderRepo = container.resolve<data.IOrderRepository>(data.diOrderRepository);
        const order = await orderRepo.findById(getId(resp.headers.location));
        assert(order);
        order.status = "valid";
        orderRepo.update(order);


        const resp2 = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              {
                type: "dns",
                value: "some.com"
              }
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp2.status, 201);
      });

      it("create if authz has valid status", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              {
                type: "dns",
                value: "some.com"
              }
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);

        // Change status of order
        const orderRepo = container.resolve<data.IOrderRepository>(data.diOrderRepository);
        const order = await orderRepo.findById(getId(resp.headers.location));
        assert(order);
        order.status = "valid";
        orderRepo.update(order);

        // Change status of authz
        const authzRepo = container.resolve<data.IAuthorizationRepository>(data.diAuthorizationRepository);
        const jsonOrder = resp.json<protocol.Order>();
        const authz = await authzRepo.findById(getId(jsonOrder.authorizations[0]));
        assert(authz);
        authz.status = "valid";
        authzRepo.update(authz);


        const resp2 = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              {
                type: "dns",
                value: "some.com"
              }
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp2.status, 201);

        const json = resp2.json<protocol.Order>();
        assert.strictEqual(json.authorizations[0], jsonOrder.authorizations[0]);
        assert.strictEqual(json.status, "ready");
      });

      it("incorrect identifier type", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              { type: "wrong", value: "some.com" },
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 403);

        const error = resp.json<protocol.Error>();
        assert.strictEqual(error.type, ErrorType.unsupportedIdentifier);
      });

      it("incorrect identifier value", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              { type: "dns", value: "wrong domain name" },
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 403);

        const error = resp.json<protocol.Error>();
        assert.strictEqual(error.type, ErrorType.malformed);
      });

    });

    context("get", () => {

      context("status", () => {
        async function changeAuthzStatus(location: string, status: protocol.AuthorizationStatus) {
          const authzRepo = container.resolve<data.IAuthorizationRepository>(data.diAuthorizationRepository);
          const authz = await authzRepo.findById(getId(location));
          assert(authz);
          authz.status = status;
          authzRepo.update(authz);
        }

        it("authz: valid, valid ", async () => {
          // Create new account
          const client = await createAccount({}, (resp) => {
            assert.strictEqual(resp.status, 201);
          });

          const resp = await controller.createOrder(await createPostRequest(
            {
              identifiers: [
                { type: "dns", value: "some.com" },
                { type: "dns", value: "some2.com" },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys));

          assert.strictEqual(resp.status, 201);
          const id = getId(resp.headers.location);

          const order = resp.json<protocol.Order>();
          assert.strictEqual(order.status, "pending");

          changeAuthzStatus(order.authorizations[0], "valid");
          changeAuthzStatus(order.authorizations[1], "valid");

          const resp2 = await controller.postOrder(await createPostRequest(
            "",
            `${baseAddress}/order/${id}`,
            client.location!,
            client.keys), id);
          assert.strictEqual(resp2.status, 200);

          const order2 = resp2.json<protocol.Order>();
          assert.strictEqual(order2.status, "ready");
        });

        it("authz: valid, pending ", async () => {
          // Create new account
          const client = await createAccount({}, (resp) => {
            assert.strictEqual(resp.status, 201);
          });

          const resp = await controller.createOrder(await createPostRequest(
            {
              identifiers: [
                { type: "dns", value: "some.com" },
                { type: "dns", value: "some2.com" },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys));

          assert.strictEqual(resp.status, 201);
          const id = getId(resp.headers.location);

          const order = resp.json<protocol.Order>();
          assert.strictEqual(order.status, "pending");

          changeAuthzStatus(order.authorizations[0], "valid");

          const resp2 = await controller.postOrder(await createPostRequest(
            "",
            `${baseAddress}/order/${id}`,
            client.location!,
            client.keys), id);
          assert.strictEqual(resp2.status, 200);

          const order2 = resp2.json<protocol.Order>();
          assert.strictEqual(order2.status, "pending");
        });

        it("authz: valid, invalid ", async () => {
          // Create new account
          const client = await createAccount({}, (resp) => {
            assert.strictEqual(resp.status, 201);
          });

          const resp = await controller.createOrder(await createPostRequest(
            {
              identifiers: [
                { type: "dns", value: "some.com" },
                { type: "dns", value: "some2.com" },
              ],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys));

          assert.strictEqual(resp.status, 201);
          const id = getId(resp.headers.location);

          const order = resp.json<protocol.Order>();
          assert.strictEqual(order.status, "pending");

          changeAuthzStatus(order.authorizations[0], "valid");
          changeAuthzStatus(order.authorizations[1], "invalid");

          const resp2 = await controller.postOrder(await createPostRequest(
            "",
            `${baseAddress}/order/${id}`,
            client.location!,
            client.keys), id);
          assert.strictEqual(resp2.status, 200);

          const order2 = resp2.json<protocol.Order>();
          assert.strictEqual(order2.status, "invalid");
          assert(order2.error);
        });

      });

    });

  });

});
