import { type AttributesValues } from "./attribute";
import {
  ensureEntityAttributeIsRegistered,
  ensureEntityAttributesAreRegistered,
  ensureEntityCanLackParent,
  ensureEntityChildAllowed,
  ensureEntityIsRegistered,
  type Builder,
} from "./builder";
import { createDataManager } from "./data-manager";
import {
  createDebounceManager,
  type DebounceManager,
} from "./debounce-manager";
import {
  SchemaValidationError,
  validateSchemaIntegrity,
  type BaseSchemaEntity,
  type EntitiesAttributesErrors,
  type EntityAttributesErrors,
  type Schema,
  type SchemaEntity,
  type SchemaEntityWithId,
} from "./schema";
import { type Subscribe, type SubscriptionEvent } from "./subscription-manager";
import { insertIntoSetAtIndex, type KeyofUnion } from "./utils";

type InternalBuilderStoreEntity<TBuilder extends Builder = Builder> =
  BaseSchemaEntity<
    TBuilder,
    {
      children?: Set<string>;
    }
  >;

type InternalBuilderStoreEntityWithId<TBuilder extends Builder = Builder> =
  InternalBuilderStoreEntity<TBuilder> & { id: string };

type InternalBuilderStoreData<TBuilder extends Builder = Builder> = {
  schema: {
    entities: Map<string, InternalBuilderStoreEntity<TBuilder>>;
    root: Set<string>;
  };
  entitiesAttributesErrors: Map<string, EntityAttributesErrors<TBuilder>>;
};

export type BuilderStoreData<TBuilder extends Builder = Builder> = {
  schema: Schema<TBuilder>;
  entitiesAttributesErrors: EntitiesAttributesErrors<TBuilder>;
};

export const builderStoreEventsNames = {
  EntityAdded: "EntityAdded",
  EntityUpdated: "EntityUpdated",
  EntityAttributeUpdated: "EntityAttributeUpdated",
  EntityDeleted: "EntityDeleted",
  EntityCloned: "EntityCloned",
  RootUpdated: "RootUpdated",
  EntityAttributeErrorUpdated: "EntityAttributeErrorUpdated",
  DataSet: "DataSet",
} as const;

export type BuilderStoreEventName =
  (typeof builderStoreEventsNames)[keyof typeof builderStoreEventsNames];

export type BuilderStoreEvent<TBuilder extends Builder = Builder> =
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityAdded,
      {
        entity: SchemaEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityUpdated,
      {
        entity: SchemaEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityAttributeUpdated,
      {
        entity: SchemaEntityWithId<TBuilder>;
        attributeName: KeyofUnion<SchemaEntity<TBuilder>["attributes"]>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityDeleted,
      {
        entity: SchemaEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityCloned,
      {
        entity: SchemaEntityWithId<TBuilder>;
        entityClone: SchemaEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.DataSet,
      {
        data: BuilderStoreData<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityAttributeErrorUpdated,
      {
        entity: SchemaEntityWithId<TBuilder>;
        attributeName: KeyofUnion<SchemaEntity<TBuilder>["attributes"]>;
        error: unknown;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.RootUpdated,
      {
        root: BuilderStoreData<TBuilder>["schema"]["root"];
      }
    >;

function ensureEntityExists<TBuilder extends Builder>(
  id: string,
  entities: InternalBuilderStoreData<TBuilder>["schema"]["entities"],
): InternalBuilderStoreEntity<TBuilder> {
  const entity = entities.get(id);

  if (!entity) {
    throw new Error(`Entity with ID "${id}" was not found.`);
  }

  const entityClone = { ...entity };

  if (entityClone.children) {
    entityClone.children = new Set(entityClone.children);
  }

  return entityClone;
}

function deleteEntity<TBuilder extends Builder>(
  entityId: string,
  data: InternalBuilderStoreData<TBuilder>,
): {
  data: InternalBuilderStoreData<TBuilder>;
  deletedEntities: InternalBuilderStoreEntityWithId<TBuilder>[];
} {
  const entity = ensureEntityExists(entityId, data.schema.entities);

  const newData: InternalBuilderStoreData<TBuilder> = {
    ...data,
    schema: {
      ...data.schema,
      entities: new Map(data.schema.entities),
    },
  };

  newData.schema.root.delete(entityId);

  if (entity.parentId) {
    const parentEntity = ensureEntityExists(
      entity.parentId,
      newData.schema.entities,
    );

    parentEntity.children?.delete(entityId);

    newData.schema.entities.set(entity.parentId, parentEntity);
  }

  let deletedEntities: InternalBuilderStoreEntityWithId<TBuilder>[] = [
    {
      ...entity,
      id: entityId,
    },
  ];

  const childrenDeletionResult = Array.from(entity.children ?? []).reduce<{
    data: InternalBuilderStoreData<TBuilder>;
    deletedEntities: InternalBuilderStoreEntityWithId<TBuilder>[];
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

  childrenDeletionResult.data.schema.entities.delete(entityId);

  childrenDeletionResult.data.entitiesAttributesErrors.delete(entityId);

  return {
    data: childrenDeletionResult.data,
    deletedEntities,
  };
}

async function validateEntityAttribute<TBuilder extends Builder>(
  entityId: string,
  attributeName: string,
  builder: TBuilder,
  data: InternalBuilderStoreData<TBuilder>,
  schema: Schema<TBuilder>,
  entitiesAttributesValidationDebounceManager: DebounceManager<
    InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"]
  >,
): Promise<InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"]> {
  return entitiesAttributesValidationDebounceManager.handle(
    `${entityId}-${attributeName}`,
    async () => {
      const entity = ensureEntityExists(entityId, data.schema.entities);

      const attribute = ensureEntityAttributeIsRegistered(
        entity.type,
        attributeName,
        builder,
      );

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      const entityAttributesErrors: EntityAttributesErrors<TBuilder> = {
        ...newEntitiesAttributesErrors.get(entityId),
      };

      try {
        await attribute.validate(
          entity.attributes[attribute.name as keyof typeof entity.attributes],
          {
            schema: schema,
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
          },
        );

        delete entityAttributesErrors?.[
          attributeName as keyof EntityAttributesErrors<TBuilder>
        ];

        newEntitiesAttributesErrors.set(entityId, entityAttributesErrors);
      } catch (error) {
        newEntitiesAttributesErrors.set(entityId, {
          ...entityAttributesErrors,
          [attributeName]: error,
        });
      }

      if (
        Object.keys(newEntitiesAttributesErrors.get(entityId) ?? {}).length ===
        0
      ) {
        newEntitiesAttributesErrors.delete(entityId);
      }

      return newEntitiesAttributesErrors;
    },
    () => data.entitiesAttributesErrors,
  );
}

function createEntityAttributeErrorUpdatedEvent<
  TBuilder extends Builder,
>(options: {
  entity: SchemaEntityWithId<TBuilder>;
  attributeName: string;
  error: unknown;
}): Extract<
  BuilderStoreEvent<TBuilder>,
  { name: typeof builderStoreEventsNames.EntityAttributeErrorUpdated }
> {
  return {
    name: builderStoreEventsNames.EntityAttributeErrorUpdated,
    payload: {
      entity: options.entity,
      attributeName: options.attributeName as KeyofUnion<
        SchemaEntity<TBuilder>["attributes"]
      >,
      error: options.error,
    },
  };
}

async function validateEntityAttributes<TBuilder extends Builder>(
  entityId: string,

  data: InternalBuilderStoreData<TBuilder>,
  builder: TBuilder,
  entitiesAttributesValidationDebounceManager: DebounceManager<
    InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"]
  >,
): Promise<{
  entityAttributesErrors: EntityAttributesErrors<TBuilder> | undefined;
  events: Array<BuilderStoreEvent<TBuilder>>;
}> {
  let newEntitiesAttributesErrors = new Map(data.entitiesAttributesErrors);

  const entity = ensureEntityExists(entityId, data.schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const events: Array<BuilderStoreEvent<TBuilder>> = [];

  const schema = serializeInternalBuilderStoreSchema(data.schema);

  for (const attribute of entityDefinition.attributes) {
    newEntitiesAttributesErrors = await validateEntityAttribute(
      entityId,
      attribute.name,
      builder,
      data,
      schema,
      entitiesAttributesValidationDebounceManager,
    );

    events.push(
      createEntityAttributeErrorUpdatedEvent({
        entity: {
          ...serializeInternalBuilderStoreEntity(entity),
          id: entityId,
        },
        attributeName: attribute.name,
        error:
          newEntitiesAttributesErrors.get(entityId)?.[
            attribute.name as keyof EntityAttributesErrors<TBuilder>
          ],
      }),
    );
  }

  return {
    entityAttributesErrors: newEntitiesAttributesErrors.get(entityId),
    events,
  };
}

function ensureEntitiesAttributesErrorsAreValid<TBuilder extends Builder>(
  entitiesAttributesErrors: EntitiesAttributesErrors<TBuilder>,
  entities: Schema<TBuilder>["entities"],
  builder: TBuilder,
): EntitiesAttributesErrors<TBuilder> {
  if (
    typeof entitiesAttributesErrors !== "object" ||
    Array.isArray(entitiesAttributesErrors) ||
    entitiesAttributesErrors === null
  ) {
    throw new Error("Invalid errors format.");
  }

  const newEntitiesAttributesErrors = { ...entitiesAttributesErrors };

  for (const [entityId, attributesErrors] of Object.entries(
    entitiesAttributesErrors,
  )) {
    const entity = entities[entityId];

    if (!entity) {
      throw new Error("Entity not found.");
    }

    ensureEntityAttributesAreRegistered(
      entity.type,
      Object.keys(attributesErrors),
      builder,
    );

    newEntitiesAttributesErrors[entityId] = attributesErrors;
  }

  return newEntitiesAttributesErrors;
}

function serializeInternalBuilderStoreSchemaRoot<TBuilder extends Builder>(
  root: InternalBuilderStoreData<TBuilder>["schema"]["root"],
): Schema<TBuilder>["root"] {
  return Array.from(root);
}

function serializeInternalBuilderStoreSchema<TBuilder extends Builder>(
  schema: InternalBuilderStoreData<TBuilder>["schema"],
): Schema<TBuilder> {
  const newEntities: BuilderStoreData<TBuilder>["schema"]["entities"] = {};

  for (const [id, entity] of schema.entities) {
    newEntities[id] = serializeInternalBuilderStoreEntity(entity);
  }

  return {
    root: serializeInternalBuilderStoreSchemaRoot(schema.root),
    entities: newEntities,
  };
}

function serializeInternalBuilderStoreData<TBuilder extends Builder>(
  data: InternalBuilderStoreData<TBuilder>,
): BuilderStoreData<TBuilder> {
  return {
    schema: serializeInternalBuilderStoreSchema(data.schema),
    entitiesAttributesErrors: Object.fromEntries(data.entitiesAttributesErrors),
  };
}

function serializeInternalBuilderStoreEntity<TBuilder extends Builder>(
  entity: InternalBuilderStoreEntity<TBuilder>,
): SchemaEntity<TBuilder> {
  return {
    ...entity,
    ...(entity.children ? { children: Array.from(entity.children) } : {}),
    attributes: entity.attributes,
  };
}

function deserializeEntitiesAttributesErrors(
  entitiesAttributesErrors: EntitiesAttributesErrors,
): InternalBuilderStoreData["entitiesAttributesErrors"] {
  return new Map(Object.entries(entitiesAttributesErrors));
}

function deserializeBuilderStoreData<TBuilder extends Builder>(
  data: BuilderStoreData<TBuilder>,
): InternalBuilderStoreData<TBuilder> {
  return {
    schema: {
      entities: new Map(
        Object.entries(data.schema.entities).map(([id, entity]) => [
          id,
          {
            ...entity,
            ...(entity.children ? { children: new Set(entity.children) } : {}),
            attributes:
              entity.attributes as unknown as InternalBuilderStoreEntity<TBuilder>["attributes"],
          },
        ]),
      ),
      root: new Set(data.schema.root),
    },
    entitiesAttributesErrors: deserializeEntitiesAttributesErrors(
      data.entitiesAttributesErrors,
    ),
  };
}

function deserializeAndValidateBuilderStoreData<TBuilder extends Builder>(
  data: BuilderStoreData<TBuilder>,
  builder: TBuilder,
): InternalBuilderStoreData<TBuilder> {
  const schemaValidationResult = validateSchemaIntegrity(data.schema, builder);

  if (!schemaValidationResult.success) {
    throw new SchemaValidationError(schemaValidationResult.reason);
  }

  const validatedEntitiesAttributesErrors =
    ensureEntitiesAttributesErrorsAreValid(
      data.entitiesAttributesErrors,
      schemaValidationResult.data.entities,
      builder,
    );

  return deserializeBuilderStoreData<TBuilder>({
    schema: schemaValidationResult.data,
    entitiesAttributesErrors: validatedEntitiesAttributesErrors,
  });
}

function getEntityIndex(
  entityId: string,
  schema: InternalBuilderStoreData["schema"],
): number {
  const entity = ensureEntityExists(entityId, schema.entities);

  if (entity.parentId) {
    const parentEntity = ensureEntityExists(entity.parentId, schema.entities);

    return Array.from(parentEntity.children ?? [entityId]).indexOf(entityId);
  }

  return Array.from(schema.root ?? [entityId]).indexOf(entityId);
}

function cloneEntity<TBuilder extends Builder>(
  entity: InternalBuilderStoreEntity<TBuilder> & { index?: number },
  schema: InternalBuilderStoreData<TBuilder>["schema"],
  builder: TBuilder,
): {
  schema: InternalBuilderStoreData<TBuilder>["schema"];
  entityClone: InternalBuilderStoreEntityWithId<TBuilder>;
} {
  const { schema: schemaWithNewEntity, entity: entityClone } = addEntity(
    entity,
    schema,
    builder,
  );

  if (!entity.children) {
    return { schema: schemaWithNewEntity, entityClone };
  }

  let newSchema = { ...schemaWithNewEntity };

  entityClone.children = new Set();

  for (const childId of entity.children?.values()) {
    const childEntity = ensureEntityExists(childId, schema.entities);

    const childEntityCloningResult = cloneEntity(
      { ...childEntity, parentId: entityClone.id },
      newSchema,
      builder,
    );

    newSchema = childEntityCloningResult.schema;

    entityClone.children.add(childEntityCloningResult.entityClone.id);
  }

  return { schema: newSchema, entityClone };
}

type AddEntityPayload<TBuilder extends Builder = Builder> =
  InternalBuilderStoreEntity<TBuilder> & {
    index?: number;
  };

function addEntity<TBuilder extends Builder>(
  payload: AddEntityPayload<TBuilder>,
  schema: InternalBuilderStoreData<TBuilder>["schema"],
  builder: TBuilder,
): {
  schema: InternalBuilderStoreData<TBuilder>["schema"];
  entity: InternalBuilderStoreEntityWithId<TBuilder>;
} {
  const id = builder.entityId.generate();

  builder.entityId.validate(id);

  if (schema.entities.has(id)) {
    throw new Error(`An entitiy with the ID "${id}" already exists.`);
  }

  const newEntity: InternalBuilderStoreEntity<TBuilder> = {
    attributes: payload.attributes,
    type: payload.type,
    parentId: payload?.parentId,
  };

  ensureEntityAttributesAreRegistered(
    newEntity.type,
    Object.keys(newEntity.attributes),
    builder,
  );

  if (!newEntity.parentId) {
    delete newEntity.parentId;
  }

  const newEntities = new Map(schema.entities);

  let newRoot = new Set(schema.root);

  newEntities.set(id, newEntity);

  if (!payload?.parentId) {
    newRoot = insertIntoSetAtIndex(newRoot, id, payload?.index);

    ensureEntityCanLackParent(newEntity.type, builder);
  } else {
    const parentEntity = ensureEntityExists(payload.parentId, schema.entities);

    ensureEntityChildAllowed(parentEntity.type, newEntity.type, builder);

    parentEntity.children = insertIntoSetAtIndex(
      parentEntity.children ?? new Set(),
      id,
      payload?.index,
    );

    newEntities.set(payload.parentId, parentEntity);
  }

  return {
    schema: {
      entities: newEntities,
      root: newRoot,
    },
    entity: { ...newEntity, id },
  };
}

function ensureEntityNotGrandparent(
  grandparentId: string,
  entityId: string,
  entities: InternalBuilderStoreData["schema"]["entities"],
): boolean {
  const entity = ensureEntityExists(entityId, entities);

  if (!entity.parentId) {
    return false;
  }

  if (grandparentId === entity.parentId) {
    throw new Error("Target entity is a direct child.");
  }

  return ensureEntityNotGrandparent(grandparentId, entity.parentId, entities);
}

export function createBuilderStore<TBuilder extends Builder>(options: {
  builder: TBuilder;
  initialData?: Partial<BuilderStoreData<TBuilder>>;
}): BuilderStore<TBuilder> {
  const { getData, setData, subscribe } = createDataManager<
    InternalBuilderStoreData<TBuilder>,
    BuilderStoreEvent<TBuilder>
  >(
    deserializeAndValidateBuilderStoreData(
      {
        schema: options.initialData?.schema ?? { entities: {}, root: [] },
        entitiesAttributesErrors:
          options.initialData?.entitiesAttributesErrors ?? {},
      },
      options.builder,
    ),
  );

  const entitiesAttributesValidationDebounceManager =
    createDebounceManager<
      InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"]
    >();

  return {
    builder: options.builder,
    subscribe(listener) {
      return subscribe((data, events) =>
        listener(serializeInternalBuilderStoreData(data), events),
      );
    },
    getData() {
      return serializeInternalBuilderStoreData(getData());
    },
    setData(data) {
      const newData = deserializeAndValidateBuilderStoreData(
        data,
        options.builder,
      );

      setData(newData, [
        {
          name: builderStoreEventsNames.DataSet,
          payload: {
            data: serializeInternalBuilderStoreData(newData),
          },
        },
      ]);
    },
    addEntity(payload) {
      const data = getData();

      const { schema, entity } = addEntity(
        payload,
        data.schema,
        options.builder,
      );

      const events: Array<BuilderStoreEvent<TBuilder>> = [
        {
          name: builderStoreEventsNames.EntityAdded,
          payload: {
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entity.id,
            },
          },
        },
      ];

      if (!payload.parentId) {
        events.push({
          name: builderStoreEventsNames.RootUpdated,
          payload: {
            root: serializeInternalBuilderStoreSchemaRoot(schema.root),
          },
        });
      }

      setData(
        {
          ...data,
          schema,
        },
        events,
      );
    },
    setEntityParentId(entityId, parentId, index) {
      const data = getData();

      const newEntities = new Map(data.schema.entities);

      const newRoot = new Set(data.schema.root);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (!entity.parentId && data.schema.root.size === 1) {
        throw new Error("The root must contain at least one entity.");
      }

      ensureEntityNotGrandparent(entityId, parentId, data.schema.entities);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      if (entity.parentId) {
        const oldParentEntity = ensureEntityExists(
          entity.parentId,
          data.schema.entities,
        );

        oldParentEntity.children?.delete(entityId);

        newEntities.set(entity.parentId, oldParentEntity);

        if (entity.parentId !== parentId) {
          events.push({
            name: builderStoreEventsNames.EntityUpdated,
            payload: {
              entity: {
                ...serializeInternalBuilderStoreEntity(oldParentEntity),
                id: entity.parentId,
              },
            },
          });
        }
      } else {
        newRoot.delete(entityId);

        events.push({
          name: builderStoreEventsNames.RootUpdated,
          payload: {
            root: serializeInternalBuilderStoreSchemaRoot(newRoot),
          },
        });
      }

      entity.parentId = parentId;

      newEntities.set(entityId, entity);

      events.push({
        name: builderStoreEventsNames.EntityUpdated,
        payload: {
          entity: {
            ...serializeInternalBuilderStoreEntity(entity),
            id: entityId,
          },
        },
      });

      const newParentEntity = ensureEntityExists(
        parentId,
        data.schema.entities,
      );

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
        name: builderStoreEventsNames.EntityUpdated,
        payload: {
          entity: {
            ...serializeInternalBuilderStoreEntity(newParentEntity),
            id: parentId,
          },
        },
      });

      setData(
        {
          ...data,
          schema: {
            entities: newEntities,
            root: newRoot,
          },
        },
        events,
      );
    },
    removeEntityParentId(entityId, index) {
      const data = getData();

      const newEntities = new Map(data.schema.entities);

      const newRoot = new Set(data.schema.root);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      ensureEntityCanLackParent(entity.type, options.builder);

      if (entity.parentId) {
        const oldParentEntity = ensureEntityExists(
          entity.parentId,
          data.schema.entities,
        );

        oldParentEntity.children?.delete(entityId);

        newEntities.set(entity.parentId, oldParentEntity);

        events.push({
          name: builderStoreEventsNames.EntityUpdated,
          payload: {
            entity: {
              ...serializeInternalBuilderStoreEntity(oldParentEntity),
              id: entity.parentId,
            },
          },
        });
      }

      newRoot.delete(entityId);

      events.push({
        name: builderStoreEventsNames.RootUpdated,
        payload: {
          root: serializeInternalBuilderStoreSchemaRoot(newRoot),
        },
      });

      delete entity.parentId;

      newEntities.set(entityId, entity);

      events.push({
        name: builderStoreEventsNames.EntityUpdated,
        payload: {
          entity: {
            ...serializeInternalBuilderStoreEntity(entity),
            id: entityId,
          },
        },
      });

      setData(
        {
          ...data,
          schema: {
            entities: newEntities,
            root: insertIntoSetAtIndex(newRoot, entityId, index),
          },
        },
        events,
      );
    },
    deleteEntity(entityId) {
      const { data, deletedEntities } = deleteEntity(entityId, getData());

      const events = deletedEntities.reduce<Array<BuilderStoreEvent<TBuilder>>>(
        (result, deletedEntity) => {
          result.push({
            name: builderStoreEventsNames.EntityDeleted,
            payload: {
              entity: {
                ...serializeInternalBuilderStoreEntity(deletedEntity),
                id: deletedEntity.id,
              },
            },
          });

          if (!deletedEntity.parentId) {
            result.push({
              name: builderStoreEventsNames.RootUpdated,
              payload: {
                root: serializeInternalBuilderStoreSchemaRoot(data.schema.root),
              },
            });
          } else if (
            deletedEntity.parentId &&
            !deletedEntities.some((item) => item.id === deletedEntity.parentId)
          ) {
            const parentEntity = ensureEntityExists(
              deletedEntity.parentId,
              data.schema.entities,
            );

            result.push({
              name: builderStoreEventsNames.EntityUpdated,
              payload: {
                entity: {
                  ...serializeInternalBuilderStoreEntity(parentEntity),
                  id: deletedEntity.parentId,
                },
              },
            });
          }

          return result;
        },
        [],
      );

      setData(data, events);
    },
    setEntityAttribute(entityId, attributeName, attributeValue) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityAttributeIsRegistered(
        entity.type,
        attributeName.toString(),
        options.builder,
      );

      entity.attributes = {
        ...entity.attributes,
        [attributeName]: attributeValue,
      };

      setData(
        {
          ...data,
          schema: {
            root: data.schema.root,
            entities: data.schema.entities.set(entityId, entity),
          },
        },
        [
          {
            name: builderStoreEventsNames.EntityUpdated,
            payload: {
              entity: {
                ...serializeInternalBuilderStoreEntity(entity),
                id: entityId,
              },
            },
          },
          {
            name: builderStoreEventsNames.EntityAttributeUpdated,
            payload: {
              entity: {
                ...serializeInternalBuilderStoreEntity(entity),
                id: entityId,
              },
              attributeName,
            },
          },
        ],
      );
    },
    setEntityIndex(entityId, index) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (entity.parentId) {
        const newEntities = new Map(data.schema.entities);

        const parentEntity = ensureEntityExists(
          entity.parentId,
          data.schema.entities,
        );

        ensureEntityChildAllowed(
          parentEntity.type,
          entity.type,
          options.builder,
        );

        parentEntity.children?.delete(entityId);

        parentEntity.children = insertIntoSetAtIndex(
          parentEntity.children ?? new Set(),
          entityId,
          index,
        );

        newEntities.set(entity.parentId, parentEntity);

        setData(
          {
            ...data,
            schema: {
              ...data.schema,
              entities: newEntities,
            },
          },
          [
            {
              name: builderStoreEventsNames.EntityUpdated,
              payload: {
                entity: {
                  ...serializeInternalBuilderStoreEntity(parentEntity),
                  id: entity.parentId,
                },
              },
            },
          ],
        );

        return;
      }

      const newRoot = new Set(data.schema.root);

      newRoot.delete(entityId);

      setData(
        {
          ...data,
          schema: {
            ...data.schema,
            root: insertIntoSetAtIndex(newRoot, entityId, index),
          },
        },
        [
          {
            name: builderStoreEventsNames.RootUpdated,
            payload: {
              root: serializeInternalBuilderStoreSchemaRoot(newRoot),
            },
          },
        ],
      );
    },
    async validateEntityAttribute(entityId, attributeName) {
      const data = getData();

      const newEntitiesAttributesErrors = await validateEntityAttribute(
        entityId,
        attributeName,
        options.builder,
        data,
        serializeInternalBuilderStoreSchema(data.schema),
        entitiesAttributesValidationDebounceManager,
      );

      const entity = ensureEntityExists(entityId, data.schema.entities);

      setData(
        {
          ...data,
          entitiesAttributesErrors: newEntitiesAttributesErrors,
        },
        [
          createEntityAttributeErrorUpdatedEvent({
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            attributeName,
            error: newEntitiesAttributesErrors.get(entityId)?.[attributeName],
          }),
        ],
      );
    },
    async validateEntityAttributes(entityId) {
      const data = getData();

      const { entityAttributesErrors, events } = await validateEntityAttributes(
        entityId,
        data,
        options.builder,
        entitiesAttributesValidationDebounceManager,
      );

      const newErrors = new Map(data.entitiesAttributesErrors);

      newErrors.set(entityId, entityAttributesErrors ?? {});

      setData(
        {
          ...data,
          entitiesAttributesErrors: newErrors,
        },
        events,
      );
    },
    async validateEntitiesAttributes() {
      const data = getData();

      const newErrors = new Map(data.entitiesAttributesErrors);

      let events: Array<BuilderStoreEvent<TBuilder>> = [];

      for (const entityId of Array.from(data.schema.entities.keys())) {
        const { entityAttributesErrors, events: nextEvents } =
          await validateEntityAttributes(
            entityId,
            data,
            options.builder,
            entitiesAttributesValidationDebounceManager,
          );

        newErrors.set(entityId, entityAttributesErrors ?? {});

        events = events.concat(nextEvents);
      }

      setData(
        {
          ...data,
          entitiesAttributesErrors: newErrors,
        },
        events,
      );
    },
    resetEntityAttributeError(entityId, attributeName) {
      const data = getData();

      const newErrors = new Map(data.entitiesAttributesErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityAttributeIsRegistered(
        entity.type,
        attributeName.toString(),
        options.builder,
      );

      const entityAttributesErrors =
        data.entitiesAttributesErrors.get(entityId);

      delete entityAttributesErrors?.[attributeName];

      newErrors.set(entityId, entityAttributesErrors ?? {});

      setData(
        {
          ...data,
          entitiesAttributesErrors: newErrors,
        },
        [
          createEntityAttributeErrorUpdatedEvent({
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            attributeName,
            error: undefined,
          }),
        ],
      );
    },
    setEntityAttributeError(entityId, attributeName, error) {
      const data = getData();

      const newErrors = new Map(data.entitiesAttributesErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityAttributeIsRegistered(
        entity.type,
        attributeName.toString(),
        options.builder,
      );

      newErrors.set(entityId, {
        ...data.entitiesAttributesErrors.get(entityId),
        [attributeName]: error,
      });

      setData(
        {
          ...data,
          entitiesAttributesErrors: newErrors,
        },
        [
          createEntityAttributeErrorUpdatedEvent({
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            attributeName,
            error,
          }),
        ],
      );
    },
    resetEntityAttributesErrors(entityId) {
      const data = getData();

      const newErrors = new Map(data.entitiesAttributesErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      Object.keys(newErrors.get(entityId) ?? {}).forEach((attributeName) =>
        events.push(
          createEntityAttributeErrorUpdatedEvent({
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            attributeName,
            error: undefined,
          }),
        ),
      );

      newErrors.delete(entityId);

      setData(
        {
          ...data,
          entitiesAttributesErrors: newErrors,
        },
        events,
      );
    },
    setEntityAttributesErrors(entityId, entityAttributesErrors) {
      const data = getData();

      const newErrors = new Map(data.entitiesAttributesErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityAttributesAreRegistered(
        entity.type,
        Object.keys(entityAttributesErrors),
        options.builder,
      );

      newErrors.set(entityId, entityAttributesErrors);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      Object.entries(entityAttributesErrors).forEach(([attributeName, error]) =>
        events.push(
          createEntityAttributeErrorUpdatedEvent({
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            attributeName,
            error,
          }),
        ),
      );

      setData(
        {
          ...data,
          entitiesAttributesErrors: newErrors,
        },
        events,
      );
    },
    resetEntitiesAttributesErrors() {
      const data = getData();

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      data.entitiesAttributesErrors.forEach(
        (entityAttributesErrors, entityId) =>
          Object.keys(entityAttributesErrors).forEach((attributeName) =>
            events.push(
              createEntityAttributeErrorUpdatedEvent({
                entity: {
                  ...serializeInternalBuilderStoreEntity(
                    ensureEntityExists(entityId, data.schema.entities),
                  ),
                  id: entityId,
                },
                attributeName,
                error: undefined,
              }),
            ),
          ),
      );

      setData(
        {
          ...data,
          entitiesAttributesErrors: new Map(),
        },
        events,
      );
    },
    setEntitiesAttributesErrors(entitiesAttributesErrors) {
      const newData = deserializeAndValidateBuilderStoreData(
        {
          schema: serializeInternalBuilderStoreSchema(getData().schema),
          entitiesAttributesErrors,
        },
        options.builder,
      );

      setData(newData, [
        {
          name: builderStoreEventsNames.DataSet,
          payload: {
            data: serializeInternalBuilderStoreData(newData),
          },
        },
      ]);
    },
    cloneEntity(entityId) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const { schema: newSchema, entityClone } = cloneEntity(
        {
          ...entity,
          index: getEntityIndex(entityId, data.schema) + 1,
        },
        data.schema,
        options.builder,
      );

      const events: Array<BuilderStoreEvent<TBuilder>> = [
        {
          name: builderStoreEventsNames.EntityCloned,
          payload: {
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            entityClone: {
              ...serializeInternalBuilderStoreEntity(entityClone),
              id: entityClone.id,
            },
          },
        },
      ];

      if (entity.parentId) {
        events.push({
          name: "EntityUpdated",
          payload: {
            entity: {
              ...serializeInternalBuilderStoreEntity(
                ensureEntityExists(entity.parentId, newSchema.entities),
              ),
              id: entity.parentId,
            },
          },
        });
      } else {
        events.push({
          name: "RootUpdated",
          payload: {
            root: serializeInternalBuilderStoreSchemaRoot(newSchema.root),
          },
        });
      }

      setData(
        {
          ...data,
          schema: newSchema,
        },
        events,
      );
    },
  };
}

export type BuilderStore<TBuilder extends Builder = Builder> = {
  getData(): BuilderStoreData<TBuilder>;
  setData(data: BuilderStoreData<TBuilder>): void;
  subscribe(
    ...args: Parameters<
      Subscribe<BuilderStoreData<TBuilder>, BuilderStoreEvent<TBuilder>>
    >
  ): ReturnType<
    Subscribe<BuilderStoreData<TBuilder>, BuilderStoreEvent<TBuilder>>
  >;
  builder: TBuilder;
  addEntity(
    payload: InternalBuilderStoreEntity<TBuilder> & {
      index?: number;
    },
  ): void;
  setEntityParentId(entityId: string, parentId: string, index?: number): void;
  removeEntityParentId(entityId: string, index?: number): void;
  setEntityIndex(entityId: string, index: number): void;
  setEntityAttribute<
    TAttributeName extends KeyofUnion<
      InternalBuilderStoreEntity<TBuilder>["attributes"]
    >,
  >(
    entityId: string,
    attributeName: TAttributeName,
    attributeValue: AttributesValues<
      TBuilder["entities"][number]["attributes"]
    >[TAttributeName],
  ): void;
  deleteEntity(entityId: string): void;
  validateEntityAttribute<
    TAttributeName extends KeyofUnion<SchemaEntity<TBuilder>["attributes"]>,
  >(
    entityId: string,
    attributeName: TAttributeName,
  ): Promise<void>;
  validateEntityAttributes(entityId: string): Promise<void>;
  validateEntitiesAttributes(): Promise<void>;
  resetEntityAttributeError<
    TAttributeName extends KeyofUnion<SchemaEntity<TBuilder>["attributes"]>,
  >(
    entityId: string,
    attributeName: TAttributeName,
  ): void;
  setEntityAttributeError<
    TAttributeName extends KeyofUnion<SchemaEntity<TBuilder>["attributes"]>,
  >(
    entityId: string,
    attributeName: TAttributeName,
    error?: unknown,
  ): void;
  resetEntityAttributesErrors(entityId: string): void;
  setEntityAttributesErrors(
    entityId: string,
    entityAttributesErrors: EntityAttributesErrors<TBuilder>,
  ): void;
  resetEntitiesAttributesErrors(): void;
  setEntitiesAttributesErrors(
    entitiesAttributesErrors: EntitiesAttributesErrors<TBuilder>,
  ): void;
  cloneEntity(entityId: string): void;
};
