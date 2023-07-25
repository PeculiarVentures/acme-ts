import * as assert from "node:assert";
import * as crypto from "node:crypto";
import "@peculiar/acme-core";
import { DynamoDB } from "aws-sdk";
import * as DynamoDbLocal from "dynamodb-local";
import { Lifecycle, container } from "tsyringe";
import { DependencyInjection } from "../src/dependency";
import {
  IAccount, IAccountRepository, diAccount, diAccountRepository,
  IAuthorization, IAuthorizationRepository, diAuthorization, diAuthorizationRepository,
  ICertificate, ICertificateRepository, diCertificate, diCertificateRepository,
  IChallenge, IChallengeRepository, diChallenge, diChallengeRepository,
  IExternalAccount, IExternalAccountRepository, diExternalAccount, diExternalAccountRepository,
  INonceRepository, diNonceRepository,
  IOrderAuthorization, IOrderAuthorizationRepository, diOrderAuthorization, diOrderAuthorizationRepository,
  IOrder, diOrder, IOrderRepository, diOrderRepository,
} from "@peculiar/acme-data";
import { JsonWebKey } from "@peculiar/jose";
import { Logger, diLogger } from "@peculiar/acme-core";
const dynamoLocalPort = 8000;

describe.skip("DynamoDB Repositories", () => {
  // NOTE: this test is skipped because it does not work on GitHub Actions
  // https://github.com/PeculiarVentures/acme-ts/actions/runs/5661747667/job/15340303282?pr=40#step:7:170
  before(async () => {
    await DynamoDbLocal.launch(dynamoLocalPort, null, [], false, true);

    container.register(diLogger, Logger, { lifecycle: Lifecycle.Singleton });
    await DependencyInjection.registerAsync(container, {
      client: {
        region: "local",
        endpoint: `http://localhost:${dynamoLocalPort}`,
        accessKeyId: "xxxxxx",
        secretAccessKey: "xxxxxx",
      },
      options: {
        tableName: "acme-test",
      },
    });
  });

  after(async () => {
    // Remove all tables
    const client = new DynamoDB({ region: "local", endpoint: `http://localhost:${dynamoLocalPort}` });
    const tables = await client.listTables().promise();
    if (tables.TableNames) {
      for (const table of tables.TableNames) {
        await client.deleteTable({ TableName: table }).promise();
      }
    }

    // Stop DynamoDB Local
    await DynamoDbLocal.stop(dynamoLocalPort);
  });

  describe("AccountRepository", () => {
    let accountRepo: IAccountRepository;

    before(() => {
      accountRepo = container.resolve<IAccountRepository>(diAccountRepository);
    });

    describe("add", () => {
      it("should create a new account", async () => {
        // Generate a new key
        const keys = await crypto.webcrypto.subtle.generateKey(
          {
            name: "ECDSA",
            namedCurve: "P-256",
          },
          false,
          ["sign", "verify"],
        );
        const publicKey = await crypto.webcrypto.subtle.exportKey("jwk", keys.publicKey);
        const jwk = new JsonWebKey(crypto.webcrypto as globalThis.Crypto, publicKey);

        // Create a new account
        const accountModel = container.resolve<IAccount>(diAccount);
        accountModel.key = jwk;
        accountModel.thumbprint = await jwk.getThumbprint();
        accountModel.status = "valid";

        // Save the account
        const account = await accountRepo.add(accountModel);

        assert.ok(account);
        assert.ok(account.id);
        assert.ok(account.createdAt);
      });
    });

    describe("findByPublicKey", () => {
      it("should find an account by public key", async () => {
        // Generate a new key
        const keys = await crypto.webcrypto.subtle.generateKey(
          {
            name: "ECDSA",
            namedCurve: "P-256",
          },
          false,
          ["sign", "verify"],
        );
        const publicKey = await crypto.webcrypto.subtle.exportKey("jwk", keys.publicKey);
        const jwk = new JsonWebKey(crypto.webcrypto as globalThis.Crypto, publicKey);

        // Create a new account
        const accountModel = container.resolve<IAccount>(diAccount);
        accountModel.key = jwk;
        accountModel.thumbprint = await jwk.getThumbprint();
        accountModel.status = "valid";

        // Save the account
        await accountRepo.add(accountModel);

        // Find the account
        const account = await accountRepo.findByPublicKey(jwk);

        assert.ok(account);
        assert.ok(account.createdAt);
      });
    });
  });

  describe("AuthorizationRepository", () => {
    let authzRepo: IAuthorizationRepository;

    before(() => {
      authzRepo = container.resolve<IAuthorizationRepository>(diAuthorizationRepository);
    });

    describe("add", () => {
      it("should create a new authorization", async () => {
        const authzModel = container.resolve<IAuthorization>(diAuthorization);
        authzModel.accountId = "test";
        authzModel.identifier = {
          type: "dns",
          value: "test.com",
        };
        authzModel.status = "pending";

        const authz = await authzRepo.add(authzModel);

        assert.ok(authz);
        assert.ok(authz.id);
        assert.ok(authz.identifier);
      });
    });

    describe("findByIdentifier", () => {
      it("should find an authorization by identifier", async () => {
        const accountId = "test";
        const authzModel = container.resolve<IAuthorization>(diAuthorization);
        authzModel.accountId = accountId;
        authzModel.identifier = {
          type: "dns",
          value: "test.com",
        };
        authzModel.status = "pending";

        await authzRepo.add(authzModel);

        const authz = await authzRepo.findByIdentifier(accountId, {
          type: "dns",
          value: "test.com",
        });

        assert.ok(authz);
        assert.ok(authz.id);
        assert.ok(authz.identifier);
      });
    });
  });

  describe("CertificateRepository", () => {
    let certRepo: ICertificateRepository;

    before(() => {
      certRepo = container.resolve<ICertificateRepository>(diCertificateRepository);
    });

    describe("add", () => {
      it("should create a new certificate", async () => {
        const certModel = container.resolve<ICertificate>(diCertificate);
        certModel.rawData = Buffer.from("test");
        certModel.status = "valid";
        certModel.type = "leaf";
        certModel.thumbprint = "test";

        const cert = await certRepo.add(certModel);

        assert.ok(cert);
        assert.ok(cert.id);
        assert.ok(cert.rawData);
        assert.ok(cert.thumbprint);
      });
    });

    describe("findByThumbprint", () => {
      it("should find a certificate by thumbprint", async () => {
        const certModel = container.resolve<ICertificate>(diCertificate);
        certModel.rawData = Buffer.from("test");
        certModel.status = "valid";
        certModel.type = "leaf";
        certModel.thumbprint = "test";

        await certRepo.add(certModel);

        const cert = await certRepo.findByThumbprint("test");

        assert.ok(cert);
        assert.ok(cert.id);
        assert.ok(cert.rawData);
        assert.ok(cert.thumbprint);
      });
    });

    describe("findCaCertificates", () => {
      it("should find CA certificates", async () => {
        // Add CA certificate
        const certCaModel = container.resolve<ICertificate>(diCertificate);
        certCaModel.rawData = Buffer.from("test");
        certCaModel.status = "valid";
        certCaModel.type = "ca";
        certCaModel.thumbprint = "testCa";

        await certRepo.add(certCaModel);

        // Add leaf certificate
        const certLeafModel = container.resolve<ICertificate>(diCertificate);
        certLeafModel.rawData = Buffer.from("test");
        certLeafModel.status = "valid";
        certLeafModel.type = "leaf";
        certLeafModel.thumbprint = "testLeaf";

        const certs = await certRepo.findCaCertificates();

        assert.ok(certs);
        assert.equal(certs.length, 1);
        assert.equal(certs[0].thumbprint, "testCa");
      });
    });
  });

  describe("ChallengeRepository", () => {
    let challengeRepo: IChallengeRepository;

    before(() => {
      challengeRepo = container.resolve<IChallengeRepository>(diChallengeRepository);
    });

    describe("add", () => {
      it("should create a new challenge", async () => {
        const challengeModel = container.resolve<IChallenge>(diChallenge);
        challengeModel.authorizationId = "test";
        challengeModel.status = "pending";
        challengeModel.type = "dns";
        challengeModel.token = "test";

        const challenge = await challengeRepo.add(challengeModel);

        assert.ok(challenge);
        assert.ok(challenge.id);
        assert.strictEqual(challenge.token, "test");
        assert.strictEqual(challenge.type, "dns");
        assert.strictEqual(challenge.status, "pending");
      });
    });

    describe("findByAuthorization", () => {
      it("should find a challenge by authorization", async () => {
        const challengeModel = container.resolve<IChallenge>(diChallenge);
        challengeModel.authorizationId = "findByAuthorization";
        challengeModel.status = "pending";
        challengeModel.type = "dns";
        challengeModel.token = "test";

        const challenge = await challengeRepo.add(challengeModel);

        const challengesFound = await challengeRepo.findByAuthorization(challenge.authorizationId);
        assert.ok(challengesFound);
        assert.equal(challengesFound.length, 1);
        assert.equal(challengesFound.filter(o => o.id === challenge.id).length, 1);
      });
    });
  });

  describe("ExternalAccountRepository", () => {
    let externalAccountRepo: IExternalAccountRepository;

    before(() => {
      externalAccountRepo = container.resolve<IExternalAccountRepository>(diExternalAccountRepository);
    });

    describe("add", () => {
      it("should create a new external account", async () => {
        const externalAccountModel = container.resolve<IExternalAccount>(diExternalAccount);
        externalAccountModel.account = "testAccount";
        externalAccountModel.key = "testKey";
        externalAccountModel.status = "valid";

        const externalAccount = await externalAccountRepo.add(externalAccountModel);

        assert.ok(externalAccount);
        assert.ok(externalAccount.id);
        assert.strictEqual(externalAccount.account, "testAccount");
        assert.strictEqual(externalAccount.key, "testKey");
        assert.strictEqual(externalAccount.status, "valid");
      });
    });
  });

  describe("NonceRepository", () => {
    let nonceRepo: INonceRepository;

    before(() => {
      nonceRepo = container.resolve<INonceRepository>(diNonceRepository);
    });

    describe("create", () => {
      it("should create a new nonce", async () => {
        const nonce = await nonceRepo.create();

        assert.ok(nonce);
      });
    });

    describe("remove", () => {
      it("should remove a nonce", async () => {
        const nonce = await nonceRepo.create();

        await nonceRepo.remove(nonce);

        const nonceFound = await nonceRepo.contains(nonce);
        assert.ok(!nonceFound);
      });
    });

    describe("contains", () => {
      it("should find a nonce", async () => {
        const nonce = await nonceRepo.create();

        const nonceFound = await nonceRepo.contains(nonce);
        assert.ok(nonceFound);
      });

      it("should not find a nonce", async () => {
        const nonce = await nonceRepo.create();
        await nonceRepo.remove(nonce);

        const nonceFound = await nonceRepo.contains(nonce);
        assert.ok(!nonceFound);
      });
    });
  });

  describe("OrderAuthorizationRepository", () => {
    let orderRepo: IOrderRepository;
    let authzRepo: IAuthorizationRepository;
    let orderAuthzRepo: IOrderAuthorizationRepository;

    before(() => {
      orderRepo = container.resolve<IOrderRepository>(diOrderRepository);
      authzRepo = container.resolve<IAuthorizationRepository>(diAuthorizationRepository);
      orderAuthzRepo = container.resolve<IOrderAuthorizationRepository>(diOrderAuthorizationRepository);
    });

    describe("add", () => {
      it("should create a new order authorization", async () => {
        // Create a new order
        const orderModel = container.resolve<IOrder>(diOrder);
        orderModel.accountId = "account1";
        orderModel.identifier = "identifier1";
        orderModel.status = "pending";
        const order = await orderRepo.add(orderModel);

        // Create a new authorization
        const authzModel = container.resolve<IAuthorization>(diAuthorization);
        authzModel.accountId = "account1";
        authzModel.identifier = {
          type: "dns",
          value: "identifier1",
        };
        authzModel.status = "pending";
        const authz = await authzRepo.add(authzModel);

        // Create a new order authorization
        const orderAuthzModel = container.resolve<IOrderAuthorization>(diOrderAuthorization);
        orderAuthzModel.authorizationId = authz.id;
        orderAuthzModel.orderId = order.id;

        const orderAuthz = await orderAuthzRepo.add(orderAuthzModel);

        assert.ok(orderAuthz);
        assert.ok(orderAuthz.id);
        assert.equal(orderAuthz.authorizationId, authz.id);
        assert.equal(orderAuthz.orderId, order.id);
      });
    });

    describe("find", () => {
      let order: IOrder;
      let authz: IAuthorization;
      before(async () => {
        // Create order1
        const order1Model = container.resolve<IOrder>(diOrder);
        order1Model.accountId = "account1";
        order1Model.identifier = "identifier1";
        order1Model.status = "pending";
        const order1 = await orderRepo.add(order1Model);

        // Create order2
        const order2Model = container.resolve<IOrder>(diOrder);
        order2Model.accountId = "account1";
        order2Model.identifier = "identifier2";
        order2Model.status = "pending";
        const order2 = await orderRepo.add(order2Model);

        // Create order3
        const order3Model = container.resolve<IOrder>(diOrder);
        order3Model.accountId = "account1";
        order3Model.identifier = "identifier3";
        order3Model.status = "pending";
        const order3 = await orderRepo.add(order3Model);

        // Create authorization1
        const authz1Model = container.resolve<IAuthorization>(diAuthorization);
        authz1Model.accountId = "account1";
        authz1Model.identifier = {
          type: "dns",
          value: "identifier1",
        };
        authz1Model.status = "pending";
        const authz1 = await authzRepo.add(authz1Model);

        // Create authorization2
        const authz2Model = container.resolve<IAuthorization>(diAuthorization);
        authz2Model.accountId = "account1";
        authz2Model.identifier = {
          type: "dns",
          value: "identifier2",
        };
        authz2Model.status = "pending";
        const authz2 = await authzRepo.add(authz2Model);

        // Create authorization3
        const authz3Model = container.resolve<IAuthorization>(diAuthorization);
        authz3Model.accountId = "account1";
        authz3Model.identifier = {
          type: "dns",
          value: "identifier3",
        };
        authz3Model.status = "pending";
        const authz3 = await authzRepo.add(authz3Model);

        // Create a new order authorization
        const model1 = container.resolve<IOrderAuthorization>(diOrderAuthorization);
        model1.authorizationId = authz1.id;
        model1.orderId = order1.id;
        await orderAuthzRepo.add(model1);

        // Create another new order authorization
        const model2 = container.resolve<IOrderAuthorization>(diOrderAuthorization);
        model2.authorizationId = authz1.id;
        model2.orderId = order2.id;
        await orderAuthzRepo.add(model2);

        // Create another new order authorization
        const model3 = container.resolve<IOrderAuthorization>(diOrderAuthorization);
        model3.authorizationId = authz2.id;
        model3.orderId = order2.id;
        await orderAuthzRepo.add(model3);

        // Create another new order authorization
        const model4 = container.resolve<IOrderAuthorization>(diOrderAuthorization);
        model4.authorizationId = authz3.id;
        model4.orderId = order3.id;
        await orderAuthzRepo.add(model4);

        order = order2;
        authz = authz1;
      });

      describe("findByOrder", () => {
        it("should find an order authorization by order", async () => {
          const orderAuthz = await orderAuthzRepo.findByOrder(order.id);

          assert.ok(orderAuthz);
          assert.equal(orderAuthz.length, 2);
        });
      });

      describe("findByAuthorization", () => {
        it("should find an order authorization by authorization", async () => {
          const orderAuthz = await orderAuthzRepo.findByAuthorization(authz.id);

          assert.ok(orderAuthz);
          assert.equal(orderAuthz.length, 2);
        });
      });
    });
  });

  describe("OrderRepository", () => {
    let orderRepo: IOrderRepository;
    let certRepo: ICertificateRepository;

    before(() => {
      orderRepo = container.resolve<IOrderRepository>(diOrderRepository);
      certRepo = container.resolve<ICertificateRepository>(diCertificateRepository);
    });

    describe("add", () => {
      it("should create a new order", async () => {
        const orderModel = container.resolve<IOrder>(diOrder);
        orderModel.accountId = "account1";
        orderModel.identifier = "identifier1";
        orderModel.status = "pending";

        const order = await orderRepo.add(orderModel);

        assert.ok(order);
        assert.ok(order.id);
        assert.equal(order.accountId, "account1");
        assert.equal(order.identifier, "identifier1");
        assert.equal(order.status, "pending");
      });
    });

    describe("find", () => {
      let order: IOrder;
      let certThumbprint: string;

      before(async () => {
        certThumbprint = crypto.webcrypto.randomUUID();
        // Add certificate
        const certModel = container.resolve<ICertificate>(diCertificate);
        certModel.rawData = Buffer.from("test");
        certModel.status = "valid";
        certModel.type = "leaf";
        certModel.thumbprint = certThumbprint;
        const cert = await certRepo.add(certModel);

        // Create order1
        const orderModel = container.resolve<IOrder>(diOrder);
        orderModel.accountId = "accountListOrder";
        orderModel.identifier = "identifier1";
        orderModel.status = "pending";
        orderModel.certificate = cert.thumbprint;
        order = await orderRepo.add(orderModel);

        // Assign certificate to order
        cert.orderId = order.id;
        await certRepo.update(cert);

        // Create order2
        const order2Model = container.resolve<IOrder>(diOrder);
        order2Model.accountId = "accountListOrder";
        order2Model.identifier = "identifier2";
        order2Model.status = "pending";
        await orderRepo.add(order2Model);

        // Create order3
        const order3Model = container.resolve<IOrder>(diOrder);
        order3Model.accountId = "accountListOrder";
        order3Model.identifier = "identifier3";
        order3Model.status = "pending";
        await orderRepo.add(order3Model);
      });

      describe("findByThumbprint", () => {
        it("should find an order by thumbprint", async () => {
          const orderFound = await orderRepo.findByThumbprint(certThumbprint);
          assert.ok(orderFound);
          assert.equal(orderFound.id, order.id);
        });
      });

      describe("lastByIdentifier", () => {
        it("should find the last order by identifier", async () => {
          const orderFound = await orderRepo.lastByIdentifier("accountListOrder", "identifier1");
          assert.ok(orderFound);
          assert.equal(orderFound.id, order.id);
        });
      });

      describe("getList", () => {
        it("should get the list of orders", async () => {
          const orderList = await orderRepo.getList("accountListOrder", {}, 10);
          assert.ok(orderList);
          assert.equal(orderList.items.length, 3);
        });
      });
    });
  });
});
