import { Extension } from "../extension";

export class ExtensionFactory {

  private static items: Map<string, typeof Extension> = new Map();

  public static register(id: string, type: any) {
    this.items.set(id, type);
  }

  public static create(data: BufferSource) {
    const extension = new Extension(data);
    const Type = this.items.get(extension.type);
    if (Type) {
      return new Type(data);
    }
    return extension;
  }
}