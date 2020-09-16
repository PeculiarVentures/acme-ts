import { ICertificate, CertificateStatus } from "@peculiar/acme-data";
import { BaseObject, IBaseDynamoObject } from "./base";
import { CRLReason } from "@peculiar/asn1-x509";

export class Certificate extends BaseObject implements ICertificate {
  public fromDynamo(data: IBaseDynamoObject): void {
    throw new Error("Method not implemented.");
  }
  public toDynamo(): Promise<IBaseDynamoObject> {
    throw new Error("Method not implemented.");
  }

  public thumbprint: string;
  public rawData: ArrayBuffer;
  public reason?: CRLReason | undefined;
  public status: CertificateStatus;

  public constructor(params: Partial<Certificate> = {}) {
    super(params);

    this.thumbprint ??= "";
    this.rawData ??= new ArrayBuffer(0);
    this.status ??= "valid";
  }

}
