import { type Builder } from "./builder";
import {
  type BuilderStoreData,
  type BuilderStoreEntity,
  type SerializedBuilderStoreData,
} from "./builder-store";

export function serializeBuilderStoreData<TBuilder extends Builder>(
  data: BuilderStoreData<TBuilder>,
): SerializedBuilderStoreData<TBuilder> {
  const newEntities: SerializedBuilderStoreData<TBuilder>["schema"]["entities"] =
    {};

  for (const [id, entity] of data.schema.entities) {
    const { children, ...entityData } = entity;

    newEntities[id] = {
      ...entityData,
      ...(children ? { children: Array.from(children) } : {}),
      inputs:
        entityData.inputs as unknown as SerializedBuilderStoreData<TBuilder>["schema"]["entities"][string]["inputs"],
    };
  }

  return {
    schema: {
      root: Array.from(data.schema.root),
      entities: newEntities,
    },
    entitiesInputsErrors: Object.fromEntries(data.entitiesInputsErrors),
  };
}

export function deserializeBuilderStoreData<TBuilder extends Builder>(
  data: SerializedBuilderStoreData<TBuilder>,
): BuilderStoreData<TBuilder> {
  return {
    schema: {
      entities: new Map(
        Object.entries(data.schema.entities).map(([id, entity]) => [
          id,
          {
            ...entity,
            ...(entity.children ? { children: new Set(entity.children) } : {}),
            inputs:
              entity.inputs as unknown as BuilderStoreEntity<TBuilder>["inputs"],
          },
        ]),
      ),
      root: new Set(data.schema.root),
    },
    entitiesInputsErrors: new Map(Object.entries(data.entitiesInputsErrors)),
  };
}
