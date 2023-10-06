import { type Builder } from "./builder";
import {
  type SchemaStoreData,
  type SchemaStoreEntity,
  type SerializedSchemaStoreData,
} from "./schema-store";

export function serializeSchemaStoreData<TBuilder extends Builder>(
  data: SchemaStoreData<TBuilder>,
): SerializedSchemaStoreData<TBuilder> {
  const newEntities: SerializedSchemaStoreData<TBuilder>["entities"] = {};

  for (const [id, entity] of data.entities) {
    const { children, ...entityData } = entity;

    newEntities[id] = {
      ...entityData,
      ...(children ? { children: Array.from(children) } : {}),
      inputs:
        entityData.inputs as unknown as SerializedSchemaStoreData<TBuilder>["entities"][string]["inputs"],
    };
  }

  return {
    root: Array.from(data.root),
    entities: newEntities,
  };
}

export function deserializeSchemaStoreData<TBuilder extends Builder>(
  schema: SerializedSchemaStoreData<TBuilder>,
): SchemaStoreData<TBuilder> {
  return {
    entities: new Map(
      Object.entries(schema.entities).map(([id, entity]) => [
        id,
        {
          ...entity,
          ...(entity.children ? { children: new Set(entity.children) } : {}),
          inputs:
            entity.inputs as unknown as SchemaStoreEntity<TBuilder>["inputs"],
        },
      ]),
    ),
    root: new Set(schema.root),
  };
}
