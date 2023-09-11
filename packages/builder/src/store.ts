import { type Builder } from "./builder";
import { createDataManager } from "./data-manager";
import { baseValidateSchema, type Schema, type SchemaEntity } from "./schema";
import { type Subscribe } from "./subscription-manager";
import { insertIntoSetAtIndex } from "./utils";

type StoreEntity<TBuilder extends Builder = Builder> = Pick<
  SchemaEntity<TBuilder>,
  "type" | "inputs" | "parentId"
> & { children?: Set<string> };

export interface StoreData<TBuilder extends Builder = Builder> {
  entities: Map<string, StoreEntity<TBuilder>>;
  root: Set<string>;
}

export interface Store<TBuilder extends Builder> {
  builder: TBuilder;
  getData(): StoreData<TBuilder>;
  subscribe: Subscribe<StoreData<TBuilder>>;
  addEntity(
    entity: StoreEntity<TBuilder>,
    mutationFields?: {
      index?: number;
      parentId?: string;
    },
  ): void;
  updateEntity(
    entityId: string,
    mutationFields: {
      index?: number;
      parentId?: string | null;
    },
  ): void;
  deleteEntity(entityId: string): void;
  getSchema(): Schema<TBuilder>;
}

function transformStoreDataToSchema<TBuilder extends Builder>(
  data: StoreData<TBuilder>,
): Schema<TBuilder> {
  const newEntities: Schema<TBuilder>["entities"] = {};

  for (const [id, entity] of data.entities) {
    const { children, ...entityData } = entity;

    newEntities[id] = {
      ...entityData,
      ...(children ? { children: Array.from(children) } : {}),
    };
  }

  return {
    root: Array.from(data.root),
    entities: newEntities,
  };
}

function transformSchemaToStoreData<TBuilder extends Builder>(
  schema: Schema<TBuilder>,
): StoreData<TBuilder> {
  return {
    entities: new Map(
      Object.entries(schema.entities).map(([id, entity]) => [
        id,
        {
          ...entity,
          ...(entity.children ? { children: new Set(entity.children) } : {}),
        },
      ]),
    ),
    root: new Set(schema.root),
  };
}

function ensureEntityExists<TBuilder extends Builder>(
  id: string,
  entities: StoreData<TBuilder>["entities"],
): StoreEntity<TBuilder> {
  const entity = entities.get(id);

  if (!entity) {
    throw new Error(`Entity with ID "${id}" was not found.`);
  }

  return entity;
}

function deleteEntity<TBuilder extends Builder>(
  entityId: string,
  data: StoreData<TBuilder>,
): StoreData<TBuilder> {
  const entity = ensureEntityExists(entityId, data.entities);

  let newData: StoreData<TBuilder> = {
    ...data,
    entities: new Map(data.entities),
  };

  newData.root.delete(entityId);

  if (entity.parentId) {
    const parentEntity = ensureEntityExists(entity.parentId, newData.entities);

    parentEntity.children?.delete(entityId);

    newData.entities.set(entity.parentId, parentEntity);
  }

  newData = Array.from(entity.children ?? []).reduce(
    (result, childId) => deleteEntity(childId, result),
    newData,
  );

  newData.entities.delete(entityId);

  return newData;
}

export function createStore<TBuilder extends Builder>(
  builder: TBuilder,
  schema?: Schema<TBuilder>,
): Store<TBuilder> {
  const { getData, setData, subscribe } = createDataManager<
    StoreData<TBuilder>
  >(transformSchemaToStoreData(baseValidateSchema(builder, schema)));

  return {
    builder,
    subscribe,
    getData() {
      return transformSchemaToStoreData(
        baseValidateSchema(builder, transformStoreDataToSchema(getData())),
      );
    },
    getSchema() {
      return baseValidateSchema(builder, transformStoreDataToSchema(getData()));
    },
    addEntity(entity, mutationFields) {
      setData((data) => {
        const entityId = builder.entityId.generate();

        const newEntity: StoreEntity<TBuilder> = {
          inputs: entity.inputs,
          type: entity.type,
          parentId: mutationFields?.parentId,
        };

        const newEntities = new Map(data.entities);

        let newRoot = new Set(data.root);

        newEntities.set(entityId, newEntity);

        if (!mutationFields?.parentId) {
          newRoot = insertIntoSetAtIndex(
            newRoot,
            entityId,
            mutationFields?.index,
          );
        } else {
          const parentEntity = ensureEntityExists(
            mutationFields.parentId,
            data.entities,
          );

          parentEntity.children = insertIntoSetAtIndex(
            parentEntity.children ?? new Set(),
            entityId,
            mutationFields?.index,
          );

          newEntities.set(mutationFields.parentId, parentEntity);
        }

        return {
          root: newRoot,
          entities: newEntities,
        };
      });
    },
    updateEntity(entityId, mutationFields) {
      setData((data) => {
        const entity = ensureEntityExists(entityId, data.entities);

        if (
          mutationFields.index === undefined &&
          mutationFields.parentId === undefined
        ) {
          return data;
        }

        const newEntities = new Map(data.entities);

        let newRoot = new Set(data.root);

        const newParentEntityId =
          mutationFields.parentId === null
            ? undefined
            : mutationFields.parentId ?? entity.parentId;

        const newEntity = {
          ...entity,
          parentId: newParentEntityId,
        };

        if (!newEntity.parentId) {
          delete newEntity.parentId;
        }

        newEntities.set(entityId, newEntity);

        newRoot.delete(entityId);

        if (entity.parentId) {
          const parentEntity = ensureEntityExists(
            entity.parentId,
            data.entities,
          );

          parentEntity.children?.delete(entityId);

          newEntities.set(entity.parentId, parentEntity);
        }

        if (mutationFields.parentId === null || !newParentEntityId) {
          newRoot = insertIntoSetAtIndex(
            newRoot,
            entityId,
            mutationFields?.index,
          );
        } else if (newParentEntityId) {
          const parentEntity = ensureEntityExists(
            newParentEntityId,
            data.entities,
          );

          parentEntity.children = insertIntoSetAtIndex(
            parentEntity.children ?? new Set(),
            entityId,
            mutationFields?.index,
          );

          newEntities.set(newParentEntityId, parentEntity);
        }

        return {
          root: newRoot,
          entities: newEntities,
        };
      });
    },
    deleteEntity(entityId) {
      setData((data) => {
        return deleteEntity(entityId, data);
      });
    },
  };
}
