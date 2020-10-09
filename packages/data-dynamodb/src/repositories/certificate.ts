import { diCertificate, ICertificate, ICertificateRepository } from "@peculiar/acme-data";
import { BaseRepository } from "./base";
import { Certificate } from "../models";

export class CertificateRepository extends BaseRepository<Certificate> implements ICertificateRepository {
  protected className = diCertificate;

  public async findCaCertificates(): Promise<ICertificate[] | null> {
    return await this.findAllByIndex("ca", "cert#");
  }
  public async findByThumbprint(thumbprint: string): Promise<ICertificate | null> {
    return await this.findById(thumbprint);
  }
}