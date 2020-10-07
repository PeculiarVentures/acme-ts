import { diOrder, ICertificate, ICertificateRepository } from "@peculiar/acme-data";
import { BaseRepository } from "./base";
import { Certificate } from "../models";

export class CertificateRepository extends BaseRepository<Certificate> implements ICertificateRepository {
  protected className = diOrder;

  public async findByThumbprint(thumbprint: string): Promise<ICertificate | null> {
    return await this.findById(thumbprint);
  }
}