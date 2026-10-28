import type { IBaseRepository } from "./base";
import type { ICertificate } from "../models";

export const diCertificateRepository = "ACME.CertificateRepository";

export interface ICertificateRepository extends IBaseRepository<ICertificate> {
  findByThumbprint(thumbprint: string): Promise<ICertificate | null>;
  findCaCertificates(): Promise<ICertificate[] | null>;
}
