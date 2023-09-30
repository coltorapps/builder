import {
  ensureEntityCanLackParent,
  ensureEntityChildAllowed,
  ensureEntityInputIsRegistered,
  ensureEntityInputsAreRegistered,
  type Builder,
} from "./builder";
import { createDataManager } from "./data-manager";
import { type InputsValues } from "./input";
import {
  validateSchemaIntegrity,
  type BaseSchemaEntity,
  type Schema,
} from "./schema";
import { type Store } from "./store";
import {
  createSubscriptionManager,
  type Subscribe,
} from "./subscription-manager";
import { insertIntoSetAtIndex, type KeyofUnion } from "./utils";

export type SchemaStoreEntity<TBuilder extends Builder = Builder> =
  BaseSchemaEntity<
    TBuilder,
    {
      children?: Set<string>;
      updatedAt?: Date;
    }
  >;

export type SchemaStoreEntityWithId<TBuilder extends Builder = Builder> =
  SchemaStoreEntity<TBuilder> & { id: string };

export interface SchemaStoreData<TBuilder extends Builder = Builder> {
  entities: Map<string, SchemaStoreEntity<TBuilder>>;
  root: Set<string>;
}

export const schemaStoreEventsNames = {
  EntityAdded: "EntityAdded",
  EntityUpdated: "EntityUpdated",
  EntityDeleted: "EntityDeleted",
} as const;

export type SchemaStoreEventName =
  (typeof schemaStoreEventsNames)[keyof typeof schemaStoreEventsNames];

export type SchemaStoreEvent<TBuilder extends Builder = Builder> =
  | {
      name: typeof schemaStoreEventsNames.EntityAdded;
      payload: {
        entity: SchemaStoreEntityWithId<TBuilder>;
      };
    }
  | {
      name: typeof schemaStoreEventsNames.EntityUpdated;
      payload: {
        entity: SchemaStoreEntityWithId<TBuilder>;
      };
    }
  | {
      name: typeof schemaStoreEventsNames.EntityDeleted;
      payload: {
        entity: SchemaStoreEntityWithId<TBuilder>;
      };
    };

export interface SchemaStore<TBuilder extends Builder = Builder>
  extends Store<SchemaStoreData<TBuilder>> {
  subscribeToEvents(
    ...args: Parameters<Subscribe<SchemaStoreEvent<TBuilder>>>
  ): ReturnType<Subscribe<SchemaStoreEvent<TBuilder>>>;
  getSerializedSchema(): Schema<TBuilder>;
  addEntity(
    payload: SchemaStoreEntity<TBuilder> & {
      index?: number;
    },
  ): void;
  updateEntity(
    id: string,
    mutationFields: {
      index?: number;
      parentId?: string | null;
    },
  ): void;
  setEntityInput<
    TInputName extends KeyofUnion<SchemaStoreEntity<TBuilder>["inputs"]>,
  >(
    id: string,
    inputName: TInputName,
    inputValue: InputsValues<
      TBuilder["entities"][number]["inputs"]
    >[TInputName],
  ): void;
  deleteEntity(id: string): void;
}

function serializeSchema<TBuilder extends Builder>(
  data: SchemaStoreData<TBuilder>,
): Schema<TBuilder> {
  const newEntities: Schema<TBuilder>["entities"] = {};

  for (const [id, entity] of data.entities) {
    const { children, ...entityData } = entity;

    newEntities[id] = {
      ...entityData,
      ...(children ? { children: Array.from(children) } : {}),
      inputs:
        entityData.inputs as unknown as Schema<TBuilder>["entities"][string]["inputs"],
    };
  }

  return {
    root: Array.from(data.root),
    entities: newEntities,
  };
}

function deserializeSchema<TBuilder extends Builder>(
  schema: Schema<TBuilder>,
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

export function ensureEntityExists<TBuilder extends Builder>(
  id: string,
  entities: SchemaStoreData<TBuilder>["entities"],
): SchemaStoreEntity<TBuilder> {
  const entity = entities.get(id);

  if (!entity) {
    throw new Error(`Entity with ID "${id}" was not found.`);
  }

  return entity;
}

function deleteEntity<TBuilder extends Builder>(
  id: string,
  data: SchemaStoreData<TBuilder>,
  onDelete: (entity: SchemaStoreEntityWithId<TBuilder>) => void,
): SchemaStoreData<TBuilder> {
  const entity = ensureEntityExists(id, data.entities);

  let newData: SchemaStoreData<TBuilder> = {
    ...data,
    entities: new Map(data.entities),
  };

  newData.root.delete(id);

  if (entity.parentId) {
    const parentEntity = ensureEntityExists(entity.parentId, newData.entities);

    parentEntity.children?.delete(id);

    parentEntity.updatedAt = new Date();

    newData.entities.set(entity.parentId, parentEntity);
  }

  newData = Array.from(entity.children ?? []).reduce(
    (result, childId) => deleteEntity(childId, result, onDelete),
    newData,
  );

  newData.entities.delete(id);

  onDelete({
    ...entity,
    id: id,
  });

  return newData;
}

export function createSchemaStore<TBuilder extends Builder>(options: {
  builder: TBuilder;
  schema?: Schema<TBuilder>;
}): SchemaStore<TBuilder> {
  const validatedSchema = validateSchemaIntegrity(
    options.schema ?? {
      entities: {},
      root: [],
    },
    {
      builder: options.builder,
    },
  );

  if (!validatedSchema.success) {
    throw validatedSchema.error;
  }

  const { getData, setData, subscribe } = createDataManager<
    SchemaStoreData<TBuilder>
  >(deserializeSchema(validatedSchema.data));

  const { subscribe: subscribeToEvents, notify: notifyEventsListeners } =
    createSubscriptionManager<SchemaStoreEvent<TBuilder>>();

  return {
    subscribe,
    subscribeToEvents,
    getData,
    getSerializedSchema() {
      return serializeSchema(getData());
    },
    addEntity(payload) {
      const data = getData();

      const id = options.builder.entityId.generate();

      options.builder.entityId.validate(id);

      if (data.entities.has(id)) {
        throw new Error(`An entitiy with the ID "${id}" already exists.`);
      }

      const newEntity: SchemaStoreEntity<TBuilder> = {
        inputs: payload.inputs,
        type: payload.type,
        parentId: payload?.parentId,
      };

      ensureEntityInputsAreRegistered(
        newEntity.type,
        Object.keys(newEntity.inputs),
        options.builder,
      );

      if (!newEntity.parentId) {
        delete newEntity.parentId;
      }

      const newEntities = new Map(data.entities);

      let newRoot = new Set(data.root);

      newEntities.set(id, newEntity);

      if (!payload?.parentId) {
        newRoot = insertIntoSetAtIndex(newRoot, id, payload?.index);

        ensureEntityCanLackParent(newEntity.type, options.builder);
      } else {
        const parentEntity = ensureEntityExists(
          payload.parentId,
          data.entities,
        );

        ensureEntityChildAllowed(
          parentEntity.type,
          newEntity.type,
          options.builder,
        );

        parentEntity.children = insertIntoSetAtIndex(
          parentEntity.children ?? new Set(),
          id,
          payload?.index,
        );

        parentEntity.updatedAt = new Date();

        newEntities.set(payload.parentId, parentEntity);
      }

      setData({
        root: newRoot,
        entities: newEntities,
      });

      notifyEventsListeners({
        name: schemaStoreEventsNames.EntityAdded,
        payload: {
          entity: { ...newEntity, id },
        },
      });
    },
    updateEntity(id, payload) {
      const data = getData();

      const entity = ensureEntityExists(id, data.entities);

      if (payload.index === undefined && payload.parentId === undefined) {
        return data;
      }

      const newEntities = new Map(data.entities);

      let newRoot = new Set(data.root);

      const newParentId =
        payload.parentId === null
          ? undefined
          : payload.parentId ?? entity.parentId;

      const newEntity: SchemaStoreEntity<TBuilder> = {
        ...entity,
        parentId: newParentId,
        updatedAt: new Date(),
      };

      if (!newEntity.parentId) {
        delete newEntity.parentId;
      }

      newEntities.set(id, newEntity);

      newRoot.delete(id);

      if (entity.parentId) {
        const parentEntity = ensureEntityExists(entity.parentId, data.entities);

        parentEntity.children?.delete(id);

        parentEntity.updatedAt = new Date();

        newEntities.set(entity.parentId, parentEntity);
      }

      if (payload.parentId === null || !newParentId) {
        newRoot = insertIntoSetAtIndex(newRoot, id, payload?.index);

        ensureEntityCanLackParent(newEntity.type, options.builder);
      } else if (newParentId) {
        const parentEntity = ensureEntityExists(newParentId, data.entities);

        ensureEntityChildAllowed(
          parentEntity.type,
          newEntity.type,
          options.builder,
        );

        parentEntity.children = insertIntoSetAtIndex(
          parentEntity.children ?? new Set(),
          id,
          payload?.index,
        );

        parentEntity.updatedAt = new Date();

        newEntities.set(newParentId, parentEntity);
      }

      setData({
        root: newRoot,
        entities: newEntities,
      });

      notifyEventsListeners({
        name: schemaStoreEventsNames.EntityUpdated,
        payload: {
          entity: { ...newEntity, id },
        },
      });
    },
    deleteEntity(id) {
      setData(
        deleteEntity(id, getData(), (deletedEntity) =>
          notifyEventsListeners({
            name: schemaStoreEventsNames.EntityDeleted,
            payload: {
              entity: deletedEntity,
            },
          }),
        ),
      );
    },
    setEntityInput(id, inputName, inputValue) {
      const data = getData();

      const entity = ensureEntityExists(id, data.entities);

      ensureEntityInputIsRegistered(
        entity.type,
        inputName.toString(),
        options.builder,
      );

      entity.updatedAt = new Date();

      entity.inputs = {
        ...entity.inputs,
        [inputName]: inputValue,
      };

      setData({
        root: data.root,
        entities: data.entities.set(id, entity),
      });

      notifyEventsListeners({
        name: schemaStoreEventsNames.EntityUpdated,
        payload: {
          entity: { ...entity, id },
        },
      });
    },
  };
}
