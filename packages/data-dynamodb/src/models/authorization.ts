import { IAuthorization, IIdentifier } from "@peculiar/acme-data";
import { AuthorizationStatus } from "@peculiar/acme-protocol";
import { BaseObject } from "./base";
import { cryptoProvider } from "@peculiar/acme-core";
import * as pvtsutils from "pvtsutils";

export class Authorization extends BaseObject implements IAuthorization {

  public static async getHashIdentifier(identifier: IIdentifier) {
    const strIdentifiers = `${identifier.type}:${identifier.value}`.toLowerCase();
    const hashIdentifier = await cryptoProvider.get()
      .subtle.digest("SHA-1", pvtsutils.Convert.FromUtf8String(strIdentifiers));
    return hashIdentifier;
  }

  public identifier: IIdentifier;
  public expires?: Date;
  public wildcard?: boolean;
  public accountId;
  public status: AuthorizationStatus;

  public constructor(params: Partial<Authorization> = {}) {
    super(params);

    this.identifier ??= { type: "", value: "" };
    this.accountId ??= "";
    this.status ??= "pending";
  }

  //accountId#hashIdentifier#data
  public async toDynamo() {
    const hashIdentifier = await Authorization.getHashIdentifier(this.identifier);
    this.index = `authz#${pvtsutils.Convert.ToHex(hashIdentifier)}#${new Date().valueOf()}`;
    this.parentId = this.accountId.toString();
  }


  public fromDynamo(data: any) {
    this.identifier = data.identifier;
    if (data.expires) {
      this.expires = data.expires;
    }
    if (data.wildcard) {
      this.wildcard = data.wildcard;
    }
    this.accountId = data.accountId;
    this.status = data.status;
  }
}
