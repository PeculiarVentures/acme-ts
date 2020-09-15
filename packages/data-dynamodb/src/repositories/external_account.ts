import { diExternalAccount, IExternalAccountRepository } from "@peculiar/acme-data";
import { ExternalAccount } from "../models";
import { BaseRepository } from "./base";

export class ExternalAccountRepository extends BaseRepository<ExternalAccount> implements IExternalAccountRepository {

  protected className = diExternalAccount;
}