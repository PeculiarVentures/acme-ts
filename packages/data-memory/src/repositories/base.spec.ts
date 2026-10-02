import * as data from "@peculiar/acme-data";
import { container } from "tsyringe";
import { describe, expect, it } from "vitest";
import * as dataMemory from "..";

describe("Data Memory Repositories", () => {
  describe("Adding", () => {
    it("default id usage", async () => {
      const scope = container.createChildContainer();
      dataMemory.DependencyInjection.register(scope);

      const eabRep = scope.resolve<data.IExternalAccountRepository>(data.diExternalAccountRepository);

      const eab1 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab1);
      expect(eab1.id).toBe(1);

      const eab2 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab2);
      expect(eab2.id).toBe(2);
      expect(eab2.id).not.toBe(eab1.id);
    });

    it("custom id usage", async () => {
      const scope = container.createChildContainer();
      dataMemory.DependencyInjection.register(scope);

      const eabRep = scope.resolve<data.IExternalAccountRepository>(data.diExternalAccountRepository);

      const eab1 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab1);
      expect(eab1.id).toBe(1);

      const eab2 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      eab2.id = 3;
      await eabRep.add(eab2);
      expect(eab2.id).toBe(3);

      const eab3 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab3);
      expect(eab3.id).toBe(2);

      const eab4 = scope.resolve<data.IExternalAccount>(data.diExternalAccount);
      await eabRep.add(eab4);
      expect(eab4.id).toBe(4);
    });
  });
});
