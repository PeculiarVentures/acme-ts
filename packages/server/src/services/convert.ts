import * as protocol from "@peculiar/acme-protocol";
import { BaseService } from "./base";
import { IConvertService } from "./types";
import { IAccount } from "@peculiar/acme-data";
import { injectable } from "tsyringe";

@injectable()
export class ConvertService extends BaseService implements IConvertService {

  public toAccount(account: IAccount): protocol.Account {
    throw new Error("Method not implemented.");
  }

}