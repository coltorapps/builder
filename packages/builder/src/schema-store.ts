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
  type SchemaEntity,
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

type SerializedSchemaStoreStoreData<TBuilder extends Builder = Builder> =
  Schema<TBuilder>;

export interface SchemaStoreData<TBuilder extends Builder = Builder> {
  entities: Map<string, SchemaStoreEntity<TBuilder>>;
  root: Set<string>;
}

export const schemaStoreEventsNames = {
  EntityAdded: "EntityAdded",
  EntityUpdated: "EntityUpdated",
  EntityInputUpdated: "EntityInputUpdated",
  EntityDeleted: "EntityDeleted",
  RootUpdated: "RootUpdated",
  DataSet: "DataSet",
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
      typeof schemaStoreEventsNames.EntityInputUpdated,
      {
        entity: SchemaStoreEntityWithId<TBuilder>;
        inputName: KeyofUnion<SchemaEntity<TBuilder>["inputs"]>;
      }
    >
  | SubscriptionEvent<
      typeof schemaStoreEventsNames.EntityDeleted,
      {
        entity: SchemaStoreEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof schemaStoreEventsNames.DataSet,
      {
        data: SchemaStoreData<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof schemaStoreEventsNames.RootUpdated,
      Record<string, never>
    >;

export interface SchemaStore<TBuilder extends Builder = Builder>
  extends Store<SchemaStoreData<TBuilder>, SchemaStoreEvent<TBuilder>> {
  getSerializedData(): SerializedSchemaStoreStoreData<TBuilder>;
  addEntity(
    payload: SchemaStoreEntity<TBuilder> & {
      index?: number;
    },
  ): void;
  moveEntityToParent(entityId: string, parentId: string, index?: number): void;
  moveEntityToRoot(entityId: string, index?: number): void;
  setEntityInput<
    TInputName extends KeyofUnion<SchemaStoreEntity<TBuilder>["inputs"]>,
  >(
    entityId: string,
    inputName: TInputName,
    inputValue: InputsValues<
      TBuilder["entities"][number]["inputs"]
    >[TInputName],
  ): void;
  deleteEntity(entityId: string): void;
}

export function serializeSchemaStoreData<TBuilder extends Builder>(
  data: SchemaStoreData<TBuilder>,
): SerializedSchemaStoreStoreData<TBuilder> {
  const newEntities: SerializedSchemaStoreStoreData<TBuilder>["entities"] = {};

  for (const [id, entity] of data.entities) {
    const { children, ...entityData } = entity;

    newEntities[id] = {
      ...entityData,
      ...(children ? { children: Array.from(children) } : {}),
      inputs:
        entityData.inputs as unknown as SerializedSchemaStoreStoreData<TBuilder>["entities"][string]["inputs"],
    };
  }

  return {
    root: Array.from(data.root),
    entities: newEntities,
  };
}

export function deserializeSchemaStoreData<TBuilder extends Builder>(
  schema: SerializedSchemaStoreStoreData<TBuilder>,
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
  entityId: string,
  data: SchemaStoreData<TBuilder>,
): {
  data: SchemaStoreData<TBuilder>;
  deletedEntities: SchemaStoreEntityWithId<TBuilder>[];
} {
  const entity = ensureEntityExists(entityId, data.entities);

  const newData: SchemaStoreData<TBuilder> = {
    ...data,
    entities: new Map(data.entities),
  };

  newData.root.delete(entityId);

  if (entity.parentId) {
    const parentEntity = ensureEntityExists(entity.parentId, newData.entities);

    parentEntity.children?.delete(entityId);

    newData.entities.set(entity.parentId, parentEntity);
  }

  let deletedEntities: SchemaStoreEntityWithId<TBuilder>[] = [
    {
      ...entity,
      id: entityId,
    },
  ];

  const childrenDeletionResult = Array.from(entity.children ?? []).reduce<{
    data: SchemaStoreData<TBuilder>;
    deletedEntities: SchemaStoreEntityWithId<TBuilder>[];
  }>(
    (result, childId) => {
      const childDeletion = deleteEntity(childId, result.data);

      return {
        data: childDeletion.data,
        deletedEntities: result.deletedEntities.concat(
          childDeletion.deletedEntities,
        ),
      };
    },
    { data: newData, deletedEntities: [] },
  );

  deletedEntities = deletedEntities.concat(
    childrenDeletionResult.deletedEntities,
  );

  childrenDeletionResult.data.entities.delete(entityId);

  return {
    data: childrenDeletionResult.data,
    deletedEntities,
  };
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
  >(deserializeSchemaStoreData(validatedSchema.data));

  return {
    subscribe,
    getData,
    setData(data) {
      const validatedSchema = validateSchemaIntegrity(
        serializeSchemaStoreData(data),
        {
          builder: options.builder,
        },
      );

      if (!validatedSchema.success) {
        throw validatedSchema.error;
      }

      setData(deserializeSchemaStoreData(validatedSchema.data), [
        {
          name: schemaStoreEventsNames.DataSet,
          payload: {
            data,
          },
        },
      ]);
    },
    getSerializedData() {
      return serializeSchemaStoreData(getData());
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

      const events: Array<SchemaStoreEvent<TBuilder>> = [
        {
          name: schemaStoreEventsNames.EntityAdded,
          payload: {
            entity: { ...newEntity, id },
          },
        },
      ];

      if (!newEntity.parentId) {
        events.push({
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
    moveEntityToParent(entityId, parentId, index) {
      const data = getData();

      const newEntities = new Map(data.entities);

      const newRoot = new Set(data.root);

      const entity = ensureEntityExists(entityId, data.entities);

      const events: Array<SchemaStoreEvent<TBuilder>> = [];

      if (entity.parentId) {
        const oldParentEntity = ensureEntityExists(
          entity.parentId,
          data.entities,
        );

        oldParentEntity.children?.delete(entityId);

        newEntities.set(entity.parentId, oldParentEntity);

        if (entity.parentId !== parentId) {
          events.push({
            name: schemaStoreEventsNames.EntityUpdated,
            payload: {
              entity: { ...oldParentEntity, id: entity.parentId },
            },
          });
        }
      } else {
        newRoot.delete(entityId);

        events.push({
          name: schemaStoreEventsNames.RootUpdated,
          payload: {},
        });
      }

      entity.parentId = parentId;

      newEntities.set(entityId, entity);

      events.push({
        name: schemaStoreEventsNames.EntityUpdated,
        payload: {
          entity: { ...entity, id: entityId },
        },
      });

      const newParentEntity = ensureEntityExists(parentId, data.entities);

      ensureEntityChildAllowed(
        newParentEntity.type,
        entity.type,
        options.builder,
      );

      newParentEntity.children = insertIntoSetAtIndex(
        newParentEntity.children ?? new Set(),
        entityId,
        index,
      );

      newEntities.set(parentId, newParentEntity);

      events.push({
        name: schemaStoreEventsNames.EntityUpdated,
        payload: {
          entity: { ...newParentEntity, id: parentId },
        },
      });

      setData(
        {
          entities: newEntities,
          root: newRoot,
        },
        events,
      );
    },
    moveEntityToRoot(entityId, index) {
      const data = getData();

      const newEntities = new Map(data.entities);

      const newRoot = new Set(data.root);

      const entity = ensureEntityExists(entityId, data.entities);

      const events: Array<SchemaStoreEvent<TBuilder>> = [];

      ensureEntityCanLackParent(entity.type, options.builder);

      if (entity.parentId) {
        const oldParentEntity = ensureEntityExists(
          entity.parentId,
          data.entities,
        );

        oldParentEntity.children?.delete(entityId);

        newEntities.set(entity.parentId, oldParentEntity);

        events.push({
          name: schemaStoreEventsNames.EntityUpdated,
          payload: {
            entity: { ...oldParentEntity, id: entity.parentId },
          },
        });
      }

      newRoot.delete(entityId);

      events.push({
        name: schemaStoreEventsNames.RootUpdated,
        payload: {},
      });

      delete entity.parentId;

      newEntities.set(entityId, entity);

      events.push({
        name: schemaStoreEventsNames.EntityUpdated,
        payload: {
          entity: { ...entity, id: entityId },
        },
      });

      setData(
        {
          entities: newEntities,
          root: insertIntoSetAtIndex(newRoot, entityId, index),
        },
        events,
      );
    },
    deleteEntity(entityId) {
      const { data, deletedEntities } = deleteEntity(entityId, getData());

      const events = deletedEntities.reduce<Array<SchemaStoreEvent<TBuilder>>>(
        (result, deletedEntity) => {
          result.push({
            name: schemaStoreEventsNames.EntityDeleted,
            payload: {
              entity: deletedEntity,
            },
          });

          if (!deletedEntity.parentId) {
            result.push({
              name: schemaStoreEventsNames.RootUpdated,
              payload: {},
            });
          }

          return result;
        },
        [],
      );

      setData(data, events);
    },
    setEntityInput(entityId, inputName, inputValue) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.entities);

      ensureEntityInputIsRegistered(
        entity.type,
        inputName.toString(),
        options.builder,
      );

      entity.inputs = {
        ...entity.inputs,
        [inputName]: inputValue,
      };

      setData(
        {
          root: data.root,
          entities: data.entities.set(entityId, entity),
        },
        [
          {
            name: schemaStoreEventsNames.EntityUpdated,
            payload: {
              entity: { ...entity, id: entityId },
            },
          },
          {
            name: schemaStoreEventsNames.EntityInputUpdated,
            payload: {
              entity: { ...entity, id: entityId },
              inputName,
            },
          },
        ],
      );
    },
  };
}
