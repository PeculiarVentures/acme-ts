import * as protocol from "@peculiar/acme-protocol";
import { BaseService, diServerOptions, IServerOptions } from "./base";
import { IConvertService } from "./types";
import { IAccount, IOrder } from "@peculiar/acme-data";
import { injectable, inject } from "tsyringe";

@injectable()
export class ConvertService extends BaseService implements IConvertService {

  public constructor(
    @inject(diServerOptions) options: IServerOptions,
  ) {
    super(options);
  }

  public toAccount(account: IAccount): protocol.Account {
    throw new Error("Method not implemented.");
  }

  public toOrder(order: IOrder): protocol.Account {
    throw new Error("Method not implemented.");
  }

}