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
import { type SubscriptionEvent } from "./subscription-manager";
import { insertIntoSetAtIndex, type KeyofUnion } from "./utils";

export type SchemaStoreEntity<TBuilder extends Builder = Builder> =
  BaseSchemaEntity<
    TBuilder,
    {
      children?: Set<string>;
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
  RootUpdated: "RootUpdated",
} as const;

export type SchemaStoreEventName =
  (typeof schemaStoreEventsNames)[keyof typeof schemaStoreEventsNames];

export type SchemaStoreEvent<TBuilder extends Builder = Builder> =
  | SubscriptionEvent<
      typeof schemaStoreEventsNames.EntityAdded,
      {
        entity: SchemaStoreEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof schemaStoreEventsNames.EntityUpdated,
      {
        entity: SchemaStoreEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof schemaStoreEventsNames.EntityDeleted,
      {
        entity: SchemaStoreEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof schemaStoreEventsNames.RootUpdated,
      Record<string, never>
    >;

export interface SchemaStore<TBuilder extends Builder = Builder>
  extends Store<SchemaStoreData<TBuilder>, SchemaStoreEvent<TBuilder>> {
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
    SchemaStoreData<TBuilder>,
    SchemaStoreEvent<TBuilder>
  >(deserializeSchema(validatedSchema.data));

  return {
    subscribe,
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

        newEntities.set(payload.parentId, parentEntity);
      }

      const events: Set<SchemaStoreEvent<TBuilder>> = new Set([
        {
          name: schemaStoreEventsNames.EntityAdded,
          payload: {
            entity: { ...newEntity, id },
          },
        },
      ]);

      if (!newEntity.parentId) {
        events.add({
          name: schemaStoreEventsNames.RootUpdated,
          payload: {},
        });
      }

      setData(
        {
          root: newRoot,
          entities: newEntities,
        },
        events,
      );
    },
    updateEntity(id, payload) {
      if (payload.parentId === undefined && payload.index === undefined) {
        return;
      }

      const data = getData();

      const entity = ensureEntityExists(id, data.entities);

      const newEntities = new Map(data.entities);

      let newRoot = new Set(data.root);

      if (payload.parentId === null) {
        newRoot = insertIntoSetAtIndex(newRoot, id, payload?.index);

        if (entity.parentId) {
          const parentEntity = ensureEntityExists(entity.parentId, newEntities);

          parentEntity.children?.delete(id);

          newEntities.set(entity.parentId, parentEntity);

          newEntities.set(id, { ...entity, parentId: undefined });
        }
      } else if (payload.parentId === undefined) {
        if (entity.parentId) {
          const parentEntity = ensureEntityExists(entity.parentId, newEntities);

          parentEntity.children = insertIntoSetAtIndex(
            parentEntity.children ?? new Set(),
            id,
            payload?.index,
          );

          newEntities.set(entity.parentId, parentEntity);
        } else {
          newRoot = insertIntoSetAtIndex(newRoot, id, payload?.index);
        }
      } else {
        if (entity.parentId) {
          const oldParentEntity = ensureEntityExists(
            entity.parentId,
            newEntities,
          );

          oldParentEntity.children?.delete(id);

          newEntities.set(entity.parentId, oldParentEntity);
        } else {
          newRoot.delete(id);
        }

        const newParentEntity = ensureEntityExists(
          payload.parentId,
          newEntities,
        );

        newParentEntity.children = insertIntoSetAtIndex(
          newParentEntity.children ?? new Set(),
          id,
          payload?.index,
        );

        newEntities.set(payload.parentId, newParentEntity);

        newEntities.set(id, { ...entity, parentId: payload.parentId });
      }

      // const data = getData();

      // const entity = ensureEntityExists(id, data.entities);

      // if (payload.index === undefined && payload.parentId === undefined) {
      //   return data;
      // }

      // const newEntities = new Map(data.entities);

      // let newRoot = new Set(data.root);

      // const newParentId =
      //   payload.parentId === null
      //     ? undefined
      //     : payload.parentId ?? entity.parentId;

      // const newEntity: SchemaStoreEntity<TBuilder> = {
      //   ...entity,
      //   parentId: newParentId,
      //   updatedAt: new Date(),
      // };

      // if (!newEntity.parentId) {
      //   delete newEntity.parentId;
      // }

      // newEntities.set(id, newEntity);

      // newRoot.delete(id);

      // const events: Set<SchemaStoreEvent<TBuilder>> = new Set([
      //   {
      //     name: schemaStoreEventsNames.EntityUpdated,
      //     payload: {
      //       entity: { ...newEntity, id },
      //     },
      //   },
      // ]);

      // if (entity.parentId) {
      //   const parentEntity = ensureEntityExists(entity.parentId, data.entities);

      //   parentEntity.children?.delete(id);

      //   newEntities.set(entity.parentId, parentEntity);

      //   events.add({
      //     name: schemaStoreEventsNames.EntityUpdated,
      //     payload: {
      //       entity: { ...parentEntity, id: entity.parentId },
      //     },
      //   });
      // }

      // if (payload.parentId === null || !newParentId) {
      //   ensureEntityCanLackParent(newEntity.type, options.builder);

      //   newRoot = insertIntoSetAtIndex(newRoot, id, payload?.index);

      //   events.add({
      //     name: schemaStoreEventsNames.RootUpdated,
      //     payload: {},
      //   });
      // } else if (newParentId) {
      //   const parentEntity = ensureEntityExists(newParentId, data.entities);

      //   ensureEntityChildAllowed(
      //     parentEntity.type,
      //     newEntity.type,
      //     options.builder,
      //   );

      //   parentEntity.children = insertIntoSetAtIndex(
      //     parentEntity.children ?? new Set(),
      //     id,
      //     payload?.index,
      //   );

      //   newEntities.set(newParentId, parentEntity);

      //   events.add({
      //     name: schemaStoreEventsNames.EntityUpdated,
      //     payload: {
      //       entity: { ...parentEntity, id: newParentId },
      //     },
      //   });
      // }

      // if (payload.parentId === null) {
      //   events.add({
      //     name: schemaStoreEventsNames.RootUpdated,
      //     payload: {},
      //   });
      // } else if (payload.parentId) {
      //   events.add({
      //     name: schemaStoreEventsNames.EntityUpdated,
      //     payload: {},
      //   });
      // }

      // setData(
      //   {
      //     root: newRoot,
      //     entities: newEntities,
      //   },
      //   events,
      // );
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

      entity.inputs = {
        ...entity.inputs,
        [inputName]: inputValue,
      };

      setData({
        root: data.root,
        entities: data.entities.set(id, entity),
      });
    },
  };
}
