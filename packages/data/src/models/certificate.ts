import { IBaseObject, Key } from "./base";
import { CRLReason } from "@peculiar/asn1-x509";

export type CertificateStatus = "valid" | "expired" | "revoked";
export type CertificateType = "leaf" | "ca";

export const diCertificate = "ACME.Models.Certificate";

export interface ICertificate extends IBaseObject {
    thumbprint: string;
    rawData: ArrayBuffer;
    reason?: CRLReason;
    status: CertificateStatus;
    type: CertificateType;
    orderId?: Key;
}
