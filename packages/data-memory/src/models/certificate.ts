import { ICertificate, CertificateStatus, CertificateType } from "@peculiar/acme-data";
import { BaseObject } from "./base";
import { CRLReason } from "@peculiar/asn1-x509";

export class Certificate extends BaseObject implements ICertificate {
  public thumbprint = "";
  public type: CertificateType = "leaf";
  public rawData = new ArrayBuffer(0);
  public reason?: CRLReason | undefined;
  public status: CertificateStatus = "valid";

  public constructor(params: Partial<Certificate> = {}) {
    super(params);
  }

}
