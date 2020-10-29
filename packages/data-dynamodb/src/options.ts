import { injectable } from "tsyringe";

export interface IOptions {
  tableName?: string;
}

export const diOptionsService = "Dynamo.OptionsService";

@injectable()
export class OptionsService {

  public options: IOptions;

  public constructor(options: IOptions) {
    this.options = options;
  }
}
