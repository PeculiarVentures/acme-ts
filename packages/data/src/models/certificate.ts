import { IBaseObject } from "./base";
import { CRLReason } from "@peculiar/asn1-x509";

export type CertificateStatus = "valid" | "expired" | "revoked";

export interface ICertificate extends IBaseObject {
    thumbprint: string;
    rawData: ArrayBuffer;
    reason?: CRLReason;
    status: CertificateStatus;
}