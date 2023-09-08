import { type Builder } from "./builder";
import { createDataManager } from "./data-manager";
import { baseValidateSchema, type Schema, type SchemaEntity } from "./schema";
import { type Subscribe } from "./subscription-manager";

type StoreEntity<TBuilder extends Builder = Builder> = Pick<
  SchemaEntity<TBuilder>,
  "type" | "inputs" | "parentId"
> & { children?: Set<string> };

export interface StoreData<TBuilder extends Builder = Builder> {
  entities: Map<string, StoreEntity<TBuilder>>;
  root: Set<string>;
}

interface EntityMutationFields {
  index?: number;
  parentId?: string | null;
}

export interface Store<TBuilder extends Builder> {
  builder: TBuilder;
  getData(): StoreData<TBuilder>;
  subscribe: Subscribe<StoreData<TBuilder>>;
  addEntity(
    entity: StoreEntity<TBuilder>,
    mutationFields?: EntityMutationFields,
  ): void;
  updateEntity(entityId: string, mutationFields: EntityMutationFields): void;
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

function validateStoreData<TBuilder extends Builder>(
  storeData: StoreData<TBuilder>,
  builder: TBuilder,
): StoreData<TBuilder> {
  return transformSchemaToStoreData(
    baseValidateSchema(builder, transformStoreDataToSchema(storeData)),
  );
}

function removeEntityChildFromParentEntity<TBuilder extends Builder>(
  parentEntityId: string,
  entities: StoreData<TBuilder>["entities"],
): StoreData<TBuilder>["entities"] {
  const newEntities = new Map(entities);

  const parentEntity = entities.get(parentEntityId);

  if (!parentEntity) {
    return newEntities;
  }

  parentEntity.children?.delete(parentEntityId);

  return newEntities.set(parentEntityId, parentEntity);
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
  id: string,
  data: StoreData<TBuilder>,
): StoreData<TBuilder> {
  const entity = ensureEntityExists(id, data.entities);

  const newData: StoreData<TBuilder> = {
    ...data,
    entities: new Map(data.entities),
  };

  newData.entities.delete(id);

  newData.root.delete(id);

  if (entity.parentId) {
    newData.entities = removeEntityChildFromParentEntity(
      entity.parentId,
      newData.entities,
    );
  }

  if (!entity.children || !entity.children.size) {
    return newData;
  }

  return Array.from(entity.children).reduce(
    (result, childId) => deleteEntity(childId, result),
    newData,
  );
}

function addEntityToParentChildren<TBuilder extends Builder>(
  entityId: string,
  parentEntityId: string,
  entities: StoreData<TBuilder>["entities"],
  index?: number,
): StoreData<TBuilder>["entities"] {
  const newEntities = new Map(entities);

  const entity = ensureEntityExists(entityId, entities);

  const parentEntity = ensureEntityExists(parentEntityId, entities);

  const parentChildren = Array.from(parentEntity.children ?? []);

  parentChildren.splice(index ?? parentChildren.length ?? 0, 0, entityId);

  newEntities.set(entityId, { ...entity, parentId: parentEntityId });

  return newEntities.set(parentEntityId, {
    ...parentEntity,
    children: new Set(parentChildren),
  });
}

function addEntityToRoot<TBuilder extends Builder>(
  entityId: string,
  root: StoreData<TBuilder>["root"],
  index?: number,
): StoreData<TBuilder>["root"] {
  const newRoot = Array.from(root);

  newRoot.splice(index ?? root.size, 0, entityId);

  return new Set(newRoot);
}

function upsertEntity<TBuilder extends Builder>(
  entityId: string,
  entity: StoreEntity<TBuilder>,
  mutationFields: {
    index?: number;
    parentId?: string | null;
  },
  dependencies: {
    data: StoreData<TBuilder>;
    builder: TBuilder;
  },
): StoreData<TBuilder> {
  let newRoot = new Set(dependencies.data.root);

  newRoot.delete(entityId);

  let newEntities = new Map(dependencies.data.entities);

  newEntities.set(entityId, entity);

  if (entity.parentId) {
    newEntities = removeEntityChildFromParentEntity(
      entity.parentId,
      newEntities,
    );
  }

  const newParentId = mutationFields.parentId ?? entity.parentId;

  if (
    mutationFields.parentId === null ||
    (mutationFields.parentId === undefined && !entity.parentId)
  ) {
    newRoot = addEntityToRoot(entityId, newRoot, mutationFields.index);
  } else if (newParentId) {
    newEntities = addEntityToParentChildren(
      entityId,
      newParentId,
      newEntities,
      mutationFields.index,
    );
  }

  return validateStoreData(
    {
      root: newRoot,
      entities: newEntities,
    },
    dependencies.builder,
  );
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
      return validateStoreData(getData(), builder);
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
          ...(mutationFields?.parentId
            ? { parentId: mutationFields.parentId }
            : {}),
        };

        return upsertEntity(
          entityId,
          newEntity,
          { ...mutationFields, parentId: mutationFields?.parentId ?? null },
          { data, builder },
        );
      });
    },
    updateEntity(entityId, mutationFields) {
      setData((data) => {
        const entity = ensureEntityExists(entityId, data.entities);

        return upsertEntity(entityId, entity, mutationFields, {
          data,
          builder,
        });
      });
    },
    deleteEntity(entityId) {
      setData((data) => {
        const newData = deleteEntity(entityId, data);

        return validateStoreData(newData, builder);
      });
    },
  };
}
