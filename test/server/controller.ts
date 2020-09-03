import { ContentType, ErrorType, Extension, QueryParams, Request, Response } from "@peculiar/acme-core";
import * as data from "@peculiar/acme-data";
import { IAuthorizationRepository } from "@peculiar/acme-data";
import * as dataMemory from "@peculiar/acme-data-memory";
import * as protocol from "@peculiar/acme-protocol";
import { AcmeController, diAcmeController, DependencyInjection } from "@peculiar/acme-server";
import { AsnConvert } from "@peculiar/asn1-schema";
import { GeneralName, id_ce_subjectAltName, SubjectAlternativeName } from "@peculiar/asn1-x509";
import { JsonWebKey, JsonWebSignature } from "@peculiar/jose";
import { Crypto } from "@peculiar/webcrypto";
import * as assert from "assert";
import { Pkcs10CertificateRequestGenerator } from "packages/core/src/crypto/pkcs10_cert_req_generator";
import { Convert } from "pvtsutils";
import { container } from "tsyringe";

const baseAddress = "http://localhost";

context("Server", () => {

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

  async function createPostRequest(params: any, url: string, kid: string, keys: CryptoKeyPair, queryParams: QueryParams = {}) {
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
      queryParams,
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

    async function changeAuthzStatus(location: string, status: protocol.AuthorizationStatus) {
      const authzRepo = container.resolve<data.IAuthorizationRepository>(data.diAuthorizationRepository);
      const authz = await authzRepo.findById(getId(location));
      assert(authz);
      authz.status = status;
      authzRepo.update(authz);
    }

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

    context("finalize", () => {

      it("wrong CSR message", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        // create order
        const resp = await controller.createOrder(await createPostRequest(
          {
            identifiers: [{ type: "dns", value: "some.com" }],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);
        const order = resp.json<protocol.Order>();
        const orderId = getId(resp.headers.location);

        await changeAuthzStatus(order.authorizations[0], "valid");

        const resp2 = await controller.finalizeOrder(await createPostRequest(
          {
            csr: "AaAaAaAaAaAaAaAaAaAaAaAa",
          } as protocol.Finalize,
          `${baseAddress}/finalize/${orderId}`,
          client.location!,
          client.keys), orderId);

        assert.strictEqual(resp2.status, 403);
        const error = resp2.json<protocol.Error>();
        assert.strictEqual(error.type, ErrorType.badCSR);
      });

      it("CSR doesn't have required identifiers", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        // create order
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
        const order = resp.json<protocol.Order>();
        const orderId = getId(resp.headers.location);

        await changeAuthzStatus(order.authorizations[0], "valid");
        await changeAuthzStatus(order.authorizations[1], "valid");

        const resp2 = await controller.finalizeOrder(await createPostRequest(
          {
            csr: "MIICRzCCAS8CAQAwAjEAMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArut7tLrb1BEHXImMTWipet+3/J2isn7mBv278oP7YyOkmX/Vzxvk9nvSc/B1wh6kSo6nfaxYacNNSP3r+WQYaTeLm5TsDbUfCJYtvvTuYH0GVTM8Qm7QhMZKnyUy/D60WNcRM4pnBDSEMpKppi7HhfL37DZpQnsQfr9r8LQPWZ9t/mf+FsSeWyQOQcz+ob6cODfNQIvbzpaXXdNpKIHLPW+/e4af5/WlZ9wL5Sy7kOf4X6nErdl74s1vSji9goANSQkd5TbswtFPRNybikrrisz0HtsIq2uTGDY6t3iOEHTe5qe/ux4anjbSqKVuIQEQWQOKb4h+mHTc+EC5yknihQIDAQABoAAwDQYJKoZIhvcNAQELBQADggEBAE7TU20ui1MLtxLM0UZMytYAjC7vtXxB5Vl6bzHUzZkVFW6oTeizqDxjeBtZ1SqErpgdyvzMvFSxF6f+679kl1/Zs2V0IPa4y58he3wTT/M1xCBN/bITY2cA4ETozbtK4cGoi6jY/0j8NcxTLfiBgwhE3ap+9GzLtWEhHWCXmpsohbvAktXSh1tLh4xmgoQoePEBSPbnaOmsonyzscKiBMASDvjrFdNbtD0uY2v/wYXwtRGvV/Q/O3lLWEosE4NdnZmgId4bm7ru48WucSnxuEJAkKUjDLrN0uqY/tKfX4Zy9w8Y/o+hk3QzNBVa3ZUvzDhVAmamQflvw3lXMm/JG4U=",
          } as protocol.Finalize,
          `${baseAddress}/finalize/${orderId}`,
          client.location!,
          client.keys), orderId);

        assert.strictEqual(resp2.status, 403);
        const error = resp2.json<protocol.Error>();
        assert.strictEqual(error.type, ErrorType.badCSR);
        assert(error.subproblems);
        assert.strictEqual(error.subproblems.length, 2);
      });

      it("CSR with multiple DNS", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        // create order
        const resp = await controller.createOrder(await createPostRequest(
          {
            identifiers: [
              { type: "dns", value: "some.com" },
              { type: "dns", value: "info.some.com" },
            ],
          } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);
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
        const keys = await crypto.subtle.generateKey(keyAlg, false, ["sign", "verify"]) as CryptoKeyPair;
        const req = await Pkcs10CertificateRequestGenerator.create({
          name: "CN=some.com",
          keys,
          signingAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
          extensions: [
            new Extension(id_ce_subjectAltName, false, AsnConvert.serialize(new SubjectAlternativeName([
              new GeneralName({ dNSName: "info.some.com" }),
              new GeneralName({ dNSName: "*.some.com" }),
            ])))
          ]
        });
        const resp2 = await controller.finalizeOrder(await createPostRequest(
          {
            csr: Convert.ToBase64Url(req.rawData),
          } as protocol.Finalize,
          `${baseAddress}/finalize/${orderId}`,
          client.location!,
          client.keys), orderId);

        assert.strictEqual(resp2.status, 403);
        const error = resp2.json<protocol.Error>();
        assert.strictEqual(error.type, ErrorType.badCSR);
        assert(error.subproblems);
        assert.strictEqual(error.subproblems.length, 2);
      });

    });

    context("list", () => {

      it("pagination", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        async function createOrder(dns: string, status: protocol.OrderStatus = "pending") {
          const resp = await controller.createOrder(await createPostRequest(
            {
              identifiers: [{ type: "dns", value: dns }],
            } as protocol.OrderCreateParams,
            `${baseAddress}/new-order`,
            client.location!,
            client.keys));
          assert.strictEqual(resp.status, 201);

          const id = getId(resp.headers.location);

          if (status !== "pending") {
            const orderRepo = container.resolve<data.IOrderRepository>(data.diOrderRepository);
            const order = await orderRepo.findById(id);
            assert(order);

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
        await createOrder("some22.com");
        await createOrder("some23.com");

        const resp = await controller.postOrders(await createPostRequest(
          "",
          `${baseAddress}/orders`,
          client.location!,
          client.keys));
        assert.strictEqual(resp.status, 200);

        assert.deepStrictEqual(resp.json(), {
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
          ]
        });
        assert.deepStrictEqual(resp.headers.link, [
          `<${baseAddress}/orders?cursor=1>;rel="next"`,
        ]);

        const resp2 = await controller.postOrders(await createPostRequest(
          "",
          `${baseAddress}/orders?cursor=1`,
          client.location!,
          client.keys,
          { cursor: ["1"] }));
        assert.strictEqual(resp2.status, 200);
        assert.deepStrictEqual(resp2.headers.link, [
          `<${baseAddress}/orders?cursor=0>;rel="previous"`,
          `<${baseAddress}/orders?cursor=2>;rel="next"`,
        ]);
        assert.deepStrictEqual(resp2.json(), {
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
          ]
        });
      });

    });

  });

  context("authorization", () => {

    it("create new", async () => {
      // Create new account
      const client = await createAccount({}, (resp) => {
        assert.strictEqual(resp.status, 201);
      });

      const resp = await controller.createAuthorization(await createPostRequest(
        {
          identifier: { type: "dns", value: "some.com" },
        } as protocol.AuthorizationCreateParams,
        `${baseAddress}/new-authz`,
        client.location!,
        client.keys));

      assert.strictEqual(resp.status, 201);
      assert.strictEqual(/http:\/\/localhost\/authz\/\d+/.test(resp.headers.location!), true, "Authorization response wrong Location header");

      const json = resp.json<protocol.Authorization>();
      assert.strictEqual(json.status, "pending");
      assert.deepStrictEqual(json.identifier, { type: "dns", value: "some.com" });
      assert.deepStrictEqual(json.challenges.length, 1);
    });

    context("status", () => {

      async function changeChallengeStatus(location: string, status: protocol.ChallengeStatus) {
        const challengeRepo = container.resolve<data.IChallengeRepository>(data.diChallengeRepository);
        const challenge = await challengeRepo.findById(getId(location));
        assert(challenge);
        challenge.status = status;
        challengeRepo.update(challenge);
      }

      async function testAuthzStatus(challengeStatus: protocol.ChallengeStatus, authzStatus: protocol.AuthorizationStatus) {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createAuthorization(await createPostRequest(
          {
            identifier: { type: "dns", value: "some.com" },
          } as protocol.AuthorizationCreateParams,
          `${baseAddress}/new-authz`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);

        const authz = resp.json<protocol.Authorization>();
        const authzId = getId(resp.headers.location);
        await changeChallengeStatus(authz.challenges[0].url, challengeStatus);

        const resp2 = await controller.postAuthorization(await createPostRequest(
          {} as protocol.AuthorizationCreateParams,
          `${baseAddress}/authz/${authzId}`,
          client.location!,
          client.keys), authzId);

        assert.strictEqual(resp2.status, 200);

        const authz2 = resp2.json<protocol.Authorization>();
        assert.strictEqual(authz2.status, authzStatus);
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
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createAuthorization(await createPostRequest(
          {
            identifier: { type: "dns", value: "some.com" },
          } as protocol.AuthorizationCreateParams,
          `${baseAddress}/new-authz`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);

        const authzId = getId(resp.headers.location);

        // Update expiration time
        const authzRepo = container.resolve<IAuthorizationRepository>(data.diAuthorizationRepository);
        const authzItem = await authzRepo.findById(authzId);
        assert(authzItem);
        authzItem.expires = new Date("2019/01/01");
        await authzRepo.update(authzItem);

        const resp2 = await controller.postAuthorization(await createPostRequest(
          {} as protocol.AuthorizationCreateParams,
          `${baseAddress}/authz/${authzId}`,
          client.location!,
          client.keys), authzId);

        assert.strictEqual(resp2.status, 200);

        const authz = resp2.json<protocol.Authorization>();
        assert.strictEqual(authz.status, "expired");
      });

    });

    context("POST authz", () => {

      it("deactivate", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        const resp = await controller.createOrder(await createPostRequest({
          identifiers: [{ type: "dns", value: "some.com" }],
        } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);
        assert(resp.headers.location);

        const order = resp.json<protocol.Order>();
        const orderId = getId(resp.headers.location);
        const authzLocation = order.authorizations[0];
        const authzId = getId(authzLocation);


        const resp2 = await controller.postAuthorization(await createPostRequest(
          {
            status: "deactivated",
          } as protocol.AuthorizationUpdateParams,
          authzLocation,
          client.location!,
          client.keys), authzId);

        assert.strictEqual(resp2.status, 200);

        const authz = resp2.json<protocol.Authorization>();
        assert.strictEqual(authz.status, "deactivated");

        // validate order status
        const resp3 = await controller.postOrder(await createPostRequest(
          {},
          resp.headers.location,
          client.location!,
          client.keys), orderId);

        assert.strictEqual(resp.status, 201);

        const order2 = resp3.json<protocol.Order>();
        assert.strictEqual(order2.status, "invalid");
      });

      it("deactivate inactive authz", async () => {
        // Create new account
        const client = await createAccount({}, (resp) => {
          assert.strictEqual(resp.status, 201);
        });

        // create order
        const resp = await controller.createOrder(await createPostRequest({
          identifiers: [{ type: "dns", value: "some.com" }],
        } as protocol.OrderCreateParams,
          `${baseAddress}/new-order`,
          client.location!,
          client.keys));

        assert.strictEqual(resp.status, 201);
        assert(resp.headers.location);

        const order = resp.json<protocol.Order>();
        const authzLocation = order.authorizations[0];
        const authzId = getId(authzLocation);

        // deactivate authz
        const resp2 = await controller.postAuthorization(await createPostRequest(
          {
            status: "deactivated",
          } as protocol.AuthorizationUpdateParams,
          authzLocation,
          client.location!,
          client.keys), authzId);

        assert.strictEqual(resp2.status, 200);

        // deactivate authz again
        const resp3 = await controller.postAuthorization(await createPostRequest(
          {
            status: "deactivated",
          } as protocol.AuthorizationUpdateParams,
          authzLocation,
          client.location!,
          client.keys), authzId);

        assert.strictEqual(resp3.status, 403);

        const error = resp3.json<protocol.Error>();
        assert.strictEqual(error.type, ErrorType.malformed);
      });

    });

  });

});
