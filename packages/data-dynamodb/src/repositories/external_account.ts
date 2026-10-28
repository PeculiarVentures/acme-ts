import type { IExternalAccountRepository } from "@peculiar/acme-data";
import { diExternalAccount } from "@peculiar/acme-data";
import type { ExternalAccount } from "../models";
import { BaseRepository } from "./base";

export class ExternalAccountRepository extends BaseRepository<ExternalAccount> implements IExternalAccountRepository {
  protected className = diExternalAccount;
}
