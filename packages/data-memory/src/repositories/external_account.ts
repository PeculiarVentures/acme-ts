import { IExternalAccount, IExternalAccountRepository } from "@peculiar/acme-data";
import { BaseRepository } from "./base";

export class ExternalAccountRepository extends BaseRepository<IExternalAccount> implements IExternalAccountRepository {
}