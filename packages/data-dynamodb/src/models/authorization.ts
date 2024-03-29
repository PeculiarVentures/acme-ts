import { IAuthorization, IIdentifier, Key } from "@peculiar/acme-data";
import { AuthorizationStatus } from "@peculiar/acme-protocol";
import { BaseObject, IBaseDynamoObject } from "./base";
import { cryptoProvider } from "@peculiar/x509";
import * as pvtsutils from "pvtsutils";
import { Convert } from "pvtsutils";

export interface IAuthorizationDynamo extends IBaseDynamoObject {
  identifier: IIdentifier;
  expires?: string;
  wildcard?: boolean;
  status: AuthorizationStatus;
  orders?: string[];
}

export class Authorization extends BaseObject implements IAuthorization {

  public static async getHashIdentifier(identifier: IIdentifier) {
    const strIdentifiers = `${identifier.type}:${identifier.value}`.toLowerCase();
    const hashIdentifier = await cryptoProvider.get()
      .subtle.digest("SHA-1", pvtsutils.Convert.FromUtf8String(strIdentifiers));
    return Convert.ToHex(hashIdentifier);
  }

  public identifier: IIdentifier;
  public expires?: Date;
  public wildcard?: boolean;
  public accountId: Key;
  public status: AuthorizationStatus;
  public orders?: Key[];

  public constructor(params: Partial<Authorization> = {}) {
    super(params);

    this.identifier ??= { type: "", value: "" };
    this.accountId ??= "";
    this.status ??= "pending";
  }

  public async toDynamo() {
    const hashIdentifier = await Authorization.getHashIdentifier(this.identifier);
    const dynamo: IAuthorizationDynamo = {
      id: this.id,
      index: `authz#${hashIdentifier}#${new Date().valueOf()}`,
      parentId: this.accountId.toString(),
      identifier: this.identifier,
      status: this.status,
    };
    if (this.expires) {
      dynamo.expires = this.fromDate(this.expires);
    }
    if (this.wildcard) {
      dynamo.wildcard = this.wildcard;
    }
    if (this.orders) {
      dynamo.orders = this.orders.map((a) => a.toString());
    }

    return dynamo;
  }

  public fromDynamo(data: IAuthorizationDynamo) {
    this.identifier = data.identifier;
    if (data.expires) {
      this.expires = this.toDate(data.expires);
    }
    if (data.wildcard) {
      this.wildcard = data.wildcard;
    }
    if (data.orders) {
      this.orders = data.orders.map((a) => a.toString());
    }
    this.accountId = data.parentId;
    this.status = data.status;
  }
}
