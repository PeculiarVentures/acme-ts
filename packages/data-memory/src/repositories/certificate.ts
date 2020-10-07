import { ICertificate, ICertificateRepository } from "@peculiar/acme-data";
import { BaseRepository } from "./base";

export class CertificateRepository extends BaseRepository<ICertificate> implements ICertificateRepository {

  public async findByThumbprint(thumbprint: string) {
    const item = this.items.find(o => o.thumbprint === thumbprint);
    return item ? item : null;
  }
}