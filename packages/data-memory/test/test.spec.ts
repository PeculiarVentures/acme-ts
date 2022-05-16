import * as assert from "assert";
import * as data from "@peculiar/acme-data";
import * as dataMemory from "@peculiar/acme-data-memory";
import { container } from "tsyringe";

context("Data Memory Repositories", () => {

  context("Adding", () => {

    it("default id usage", async () => {
      const scope = container.createChildContainer();
      dataMemory.DependencyInjection.register(scope);

      const eabRep = scope.resolve<data.IExternalAccountRepository>(data.diExternalAccountRepository);

      const eab1 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab1);
      assert.strictEqual(eab1.id, 1);

      const eab2 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab2);
      assert.strictEqual(eab2.id, 2);
      assert.notStrictEqual(eab2.id, eab1.id);
    });

    it("custom id usage", async () => {
      const scope = container.createChildContainer();
      dataMemory.DependencyInjection.register(scope);

      const eabRep = scope.resolve<data.IExternalAccountRepository>(data.diExternalAccountRepository);

      const eab1 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab1);
      assert.strictEqual(eab1.id, 1);

      const eab2 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      eab2.id = 3;
      await eabRep.add(eab2);
      assert.strictEqual(eab2.id, 3);

      const eab3 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab3);
      assert.strictEqual(eab3.id, 2);

      const eab4 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab4);
      assert.strictEqual(eab4.id, 4);
    });

  });

});
