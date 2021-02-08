import { IBaseRepository, Key } from "@peculiar/acme-data";
import * as dynamoose from "dynamoose";
import { BaseObject } from "../models";
import { Document } from "dynamoose/dist/Document";
import { ModelType } from "dynamoose/dist/General";
import { container } from "tsyringe";
import { diOptionsService, OptionsService } from "../options";

interface IDataTable extends Document {
  id: string;
  index: string;
  parentId: string;
}

export abstract class BaseRepository<T extends BaseObject> implements IBaseRepository<T>
{
  public static defaultTableName = "ACME";

  protected options = container.resolve<OptionsService>(diOptionsService).options;

  protected abstract className: string;
  private model?: ModelType<IDataTable>;
  private validator?: T;
  private tableName = this.options.tableName ?? BaseRepository.defaultTableName;
  private tableSchema = new dynamoose.Schema({
    id: {
      type: String,
      hashKey: true
    },
    index: {
      type: String,
    },
    parentId: {
      type: String,
      index: {
        name: "index",
        global: true,
        rangeKey: "index",
      }
    },
  }, {
    saveUnknown: true,
  });

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
      this.model = dynamoose.model<IDataTable>(this.tableName, this.tableSchema);
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
    const dataArray: Document[] = await this.getModel().query("parentId").eq(parentId)
      .where("index").beginsWith(index)
      //@ts-ignore
      .all().exec();
    if (dataArray.length) {
      return dataArray.map(o => this.fromDocument(o));
    } else {
      return [];
    }
  }

  protected async findByIndex(parentId: string, index: string) {
    const data: Document[] = await this.getModel().query("parentId").eq(parentId)
      .where("index").beginsWith(index)
      //@ts-ignore
      // .sort("descending").limit(1)
      .sort("descending")
      .exec();
    if (data.length) {
      return data.map(o => this.fromDocument(o))[0];
    } else {
      return null;
    }
  }

  protected fromDocument(data: Document) {
    const json = data.toJSON();
    const item = this.getValidator();
    item.id = json.id;
    //@ts-ignore
    item.fromDynamo(json);
    return item;
  }
}
