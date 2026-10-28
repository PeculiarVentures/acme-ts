import type { IBaseRepository, Key } from "@peculiar/acme-data";
// dynamoose is CommonJS (`export =`): Node.js ESM only exposes it as the default export.
import dynamoose from "dynamoose";
import type { BaseObject, IBaseDynamoObject } from "../models";
// Deep type imports need the .js extension: the declarations are ESM, and dynamoose has no exports map.
import type { Item } from "dynamoose/dist/Item.js";
import type { ModelType } from "dynamoose/dist/General.js";
import { container } from "tsyringe";
import type { OptionsService } from "../options";
import { diOptionsService } from "../options";

interface IDataTable extends Item {
  id: string;
  index: string;
  parentId: string;
}

export abstract class BaseRepository<T extends BaseObject> implements IBaseRepository<T> {
  public static defaultTableName = "ACME";
  // One dynamoose model per table: every repository shares the table, and each
  // dynamoose.model() call would register a new model that creates the table again.
  private static models = new Map<string, ModelType<IDataTable>>();

  protected options = container.resolve<OptionsService>(diOptionsService).options;

  protected abstract className: string;
  private model?: ModelType<IDataTable>;
  private validator?: T;
  private tableName = this.options.tableName ?? BaseRepository.defaultTableName;
  private tableSchema = new dynamoose.Schema(
    {
      id: {
        type: String,
        hashKey: true,
      },
      index: {
        type: String,
      },
      parentId: {
        type: String,
        index: {
          name: "index",
          type: "global",
          rangeKey: "index",
        },
      },
    },
    {
      saveUnknown: true,
    },
  );

  public async findById(id: Key) {
    const data = await this.getModel().get(id.toString());
    if (data) {
      return this.fromDocument(data);
    }
    return null;
  }

  public async add(item: T) {
    const dynamo = await item.toDynamo();
    const Model = this.getModel();
    const model = new Model(dynamo);
    const data = await model.save();
    return this.fromDocument(data);
  }

  public async update(item: T) {
    const dynamo = await item.toDynamo();
    const Model = this.getModel();
    await Model.update(dynamo);
    return item;
  }

  public async remove(item: T): Promise<void> {
    const Model = this.getModel();
    await Model.delete(item.id);
  }

  protected getModel() {
    if (!this.model) {
      let model = BaseRepository.models.get(this.tableName);
      if (!model) {
        model = dynamoose.model<IDataTable>(this.tableName, this.tableSchema);
        BaseRepository.models.set(this.tableName, model);
      }
      this.model = model;
    }
    return this.model;
  }

  private getValidator() {
    if (!this.validator) {
      const validator = container.resolve<T>(this.className);
      if (!validator) {
        throw new Error(`Unsupported identifier type '${this.className}'`);
      }
      return validator;
    } else {
      return this.validator;
    }
  }

  protected async findAllByIndex(parentId: string, index: string) {
    const dataArray: Item[] = await this.getModel().query("parentId").eq(parentId).where("index").beginsWith(index).all().exec();
    if (dataArray.length) {
      return dataArray.map((o) => this.fromDocument(o));
    } else {
      return [];
    }
  }

  protected async findByIndex(parentId: string, index: string) {
    const data: Item[] = await this.getModel().query("parentId").eq(parentId).where("index").beginsWith(index).sort("descending").limit(1).exec();
    if (data.length) {
      return data.map((o) => this.fromDocument(o))[0];
    } else {
      return null;
    }
  }

  protected fromDocument(data: Record<string, any>) {
    const item = this.getValidator();
    item.id = data.id;
    item.fromDynamo(data as IBaseDynamoObject);
    return item;
  }
}
