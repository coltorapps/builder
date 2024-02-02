import { type AttributesValues } from "./attribute";
import {
  ensureEntityAttributeIsRegistered,
  ensureEntityAttributesAreRegistered,
  ensureEntityCanLackParent,
  ensureEntityChildAllowed,
  ensureEntityIsRegistered,
  ensureEntityParentAllowed,
  type Builder,
  type EntitiesExtensions,
} from "./builder";
import { createDataManager } from "./data-manager";
import {
  SchemaValidationError,
  schemaValidationErrorCodes,
  validateSchemaShape,
  type BaseSchemaEntity,
  type EntitiesAttributesErrors,
  type EntityAttributesErrors,
  type Schema,
  type SchemaEntity,
  type SchemaEntityWithId,
  type SchemaValidationErrorReason,
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
  schemaError: unknown;
};

export type BuilderStoreData<TBuilder extends Builder = Builder> = {
  schema: Schema<TBuilder>;
  entitiesAttributesErrors: EntitiesAttributesErrors<TBuilder>;
  schemaError: unknown;
};

export const builderStoreEventsNames = {
  EntityAdded: "EntityAdded",
  EntityUpdated: "EntityUpdated",
  EntityAttributeUpdated: "EntityAttributeUpdated",
  EntityDeleted: "EntityDeleted",
  EntityCloned: "EntityCloned",
  RootUpdated: "RootUpdated",
  EntityAttributeErrorUpdated: "EntityAttributeErrorUpdated",
  SchemaErrorUpdated: "SchemaErrorUpdated",
  SchemaUpdated: "SchemaUpdated",
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
        isCloneOrigin: boolean;
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
      typeof builderStoreEventsNames.SchemaErrorUpdated,
      {
        error: unknown;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.SchemaUpdated,
      {
        schema: Schema<TBuilder>;
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
): Promise<InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"]> {
  const entity = ensureEntityExists(entityId, data.schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const attribute = ensureEntityAttributeIsRegistered(
    entity.type,
    attributeName,
    builder,
  );

  const newEntitiesAttributesErrors = new Map(data.entitiesAttributesErrors);

  const entityAttributesErrors: EntityAttributesErrors<TBuilder> = {
    ...newEntitiesAttributesErrors.get(entityId),
  };

  try {
    const attributeValue =
      entity.attributes[attribute.name as keyof typeof entity.attributes];

    const serializedEntity = {
      ...serializeInternalBuilderStoreEntity(entity),
      id: entityId,
    };

    const attributeValidationContext = {
      schema,
      entity: serializedEntity,
    };

    const attributeValidator = (value: unknown) =>
      attribute.validate(value, attributeValidationContext);

    const attributeExtensionValidator = entityDefinition.attributesExtensions[
      attribute.name
    ]?.validate
      ? (value: unknown) =>
          entityDefinition.attributesExtensions[attribute.name]?.validate?.(
            value,
            {
              ...attributeValidationContext,
              validate: attributeValidator,
            },
          )
      : undefined;

    const entityExtensionAttributeValidator = (
      builder.entitiesExtensions as EntitiesExtensions
    )[entity.type]?.attributes?.[attribute.name]?.validate;

    if (entityExtensionAttributeValidator) {
      await entityExtensionAttributeValidator(attributeValue, {
        ...attributeValidationContext,
        validate: attributeExtensionValidator ?? attributeValidator,
      });
    } else if (attributeExtensionValidator) {
      await attributeExtensionValidator(attributeValue);
    } else {
      await attributeValidator(attributeValue);
    }

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
    Object.keys(newEntitiesAttributesErrors.get(entityId) ?? {}).length === 0
  ) {
    newEntitiesAttributesErrors.delete(entityId);
  }

  return newEntitiesAttributesErrors;
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
      {
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      },
      schema,
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

async function validateEntitiesAttributes<TBuilder extends Builder>(
  data: InternalBuilderStoreData<TBuilder>,
  builder: TBuilder,
): Promise<{
  entitiesAttributesErrors: InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"];
  events: Array<BuilderStoreEvent<TBuilder>>;
}> {
  const newEntitiesAttributesErrors = new Map(data.entitiesAttributesErrors);

  let events: Array<BuilderStoreEvent<TBuilder>> = [];

  for (const entityId of Array.from(data.schema.entities.keys())) {
    const { entityAttributesErrors, events: nextEvents } =
      await validateEntityAttributes(entityId, data, builder);

    if (entityAttributesErrors) {
      newEntitiesAttributesErrors.set(entityId, entityAttributesErrors);
    } else {
      newEntitiesAttributesErrors.delete(entityId);
    }

    events = events.concat(nextEvents);
  }

  return {
    entitiesAttributesErrors: newEntitiesAttributesErrors,
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

function serializeInternalBuilderStoreEntitiesAttributesErrors<
  TBuilder extends Builder,
>(
  entitiesAttributesErrors: InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"],
): BuilderStoreData<TBuilder>["entitiesAttributesErrors"] {
  return Object.fromEntries(entitiesAttributesErrors);
}

function serializeInternalBuilderStoreData<TBuilder extends Builder>(
  data: InternalBuilderStoreData<TBuilder>,
): BuilderStoreData<TBuilder> {
  return {
    schema: serializeInternalBuilderStoreSchema(data.schema),
    entitiesAttributesErrors:
      serializeInternalBuilderStoreEntitiesAttributesErrors(
        data.entitiesAttributesErrors,
      ),
    schemaError: data.schemaError,
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

function deserializeSchema<TBuilder extends Builder>(
  schema: BuilderStoreData<TBuilder>["schema"],
): InternalBuilderStoreData<TBuilder>["schema"] {
  return {
    entities: new Map(
      Object.entries(schema.entities).map(([id, entity]) => [
        id,
        {
          ...entity,
          ...(entity.children ? { children: new Set(entity.children) } : {}),
          attributes:
            entity.attributes as unknown as InternalBuilderStoreEntity<TBuilder>["attributes"],
        },
      ]),
    ),
    root: new Set(schema.root),
  };
}

function deserializeBuilderStoreData<TBuilder extends Builder>(
  data: BuilderStoreData<TBuilder>,
): InternalBuilderStoreData<TBuilder> {
  return {
    schema: deserializeSchema(data.schema),
    entitiesAttributesErrors: deserializeEntitiesAttributesErrors(
      data.entitiesAttributesErrors,
    ),
    schemaError: data.schemaError,
  };
}

function deserializeAndValidateBuilderStoreData<TBuilder extends Builder>(
  data: BuilderStoreData<TBuilder>,
  builder: TBuilder,
): InternalBuilderStoreData<TBuilder> {
  const schemaValidationResult = validateSchemaShape(data.schema, builder);

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
    schemaError: data.schemaError,
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
  entityId: string,
  entity: InternalBuilderStoreEntity<TBuilder>,
  schema: InternalBuilderStoreData<TBuilder>["schema"],
  builder: TBuilder,
  options: {
    index?: number;
    isCloneOrigin: boolean;
  },
): {
  schema: InternalBuilderStoreData<TBuilder>["schema"];
  entityClone: InternalBuilderStoreEntityWithId<TBuilder>;
  events: Array<BuilderStoreEvent<TBuilder>>;
} {
  const { schema: schemaWithNewEntity, entity: entityClone } = addEntity(
    { ...entity, index: options?.index },
    schema,
    builder,
  );

  let events: Array<BuilderStoreEvent<TBuilder>> = [];

  let newSchema = { ...schemaWithNewEntity };

  if (entity.children) {
    entityClone.children = new Set();

    for (const childId of entity.children?.values()) {
      const childEntity = ensureEntityExists(childId, schema.entities);

      const childEntityCloningResult = cloneEntity(
        childId,
        { ...childEntity, parentId: entityClone.id },
        newSchema,
        builder,
        {
          index: options.index,
          isCloneOrigin: false,
        },
      );

      newSchema = childEntityCloningResult.schema;

      entityClone.children.add(childEntityCloningResult.entityClone.id);

      events = events.concat(childEntityCloningResult.events);
    }
  }

  const serializedEntity = {
    ...serializeInternalBuilderStoreEntity(entity),
    id: entityId,
  };

  events.unshift({
    name: builderStoreEventsNames.EntityCloned,
    payload: {
      entity: serializedEntity,
      entityClone: {
        ...serializeInternalBuilderStoreEntity(entityClone),
        id: entityClone.id,
      },
      isCloneOrigin: options.isCloneOrigin,
    },
  });

  return { schema: newSchema, entityClone, events };
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
  const id = builder.generateEntityId();

  builder.validateEntityId(id);

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

    ensureEntityParentAllowed(newEntity.type, parentEntity.type, builder);

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

export function createBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: {
    initialData?: Partial<BuilderStoreData<TBuilder>>;
  },
): BuilderStore<TBuilder> {
  const { getData, setData, subscribe } = createDataManager<
    InternalBuilderStoreData<TBuilder>,
    BuilderStoreEvent<TBuilder>
  >(
    deserializeAndValidateBuilderStoreData(
      {
        schema: options?.initialData?.schema ?? { entities: {}, root: [] },
        entitiesAttributesErrors:
          options?.initialData?.entitiesAttributesErrors ?? {},
        schemaError: options?.initialData?.schemaError,
      },
      builder,
    ),
  );

  return {
    builder: builder,
    subscribe(listener) {
      return subscribe((data, events) =>
        listener(serializeInternalBuilderStoreData(data), events),
      );
    },
    getData() {
      return serializeInternalBuilderStoreData(getData());
    },
    setData(data) {
      const newData = deserializeAndValidateBuilderStoreData(data, builder);

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

      const { schema, entity } = addEntity(payload, data.schema, builder);

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
      } else {
        const parentEntity = ensureEntityExists(
          payload.parentId,
          schema.entities,
        );

        events.push({
          name: builderStoreEventsNames.EntityUpdated,
          payload: {
            entity: {
              ...serializeInternalBuilderStoreEntity(parentEntity),
              id: payload.parentId,
            },
          },
        });
      }

      events.push({
        name: builderStoreEventsNames.SchemaUpdated,
        payload: {
          schema: serializeInternalBuilderStoreSchema(schema),
        },
      });

      setData(
        {
          ...data,
          schema,
        },
        events,
      );

      return {
        ...serializeInternalBuilderStoreEntity(entity),
        id: entity.id,
      };
    },
    setEntityParent(entityId, parentId, mutationOptions) {
      const data = getData();

      const newEntities = new Map(data.schema.entities);

      const newRoot = new Set(data.schema.root);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (!entity.parentId && data.schema.root.size === 1) {
        throw new Error("The root must contain at least one entity.");
      }

      const newParentEntity = ensureEntityExists(
        parentId,
        data.schema.entities,
      );

      ensureEntityParentAllowed(entity.type, newParentEntity.type, builder);

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

      ensureEntityChildAllowed(newParentEntity.type, entity.type, builder);

      newParentEntity.children = insertIntoSetAtIndex(
        newParentEntity.children ?? new Set(),
        entityId,
        mutationOptions?.index,
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

      const newSchema = {
        entities: newEntities,
        root: newRoot,
      };

      events.push({
        name: builderStoreEventsNames.SchemaUpdated,
        payload: {
          schema: serializeInternalBuilderStoreSchema(newSchema),
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
    unsetEntityParent(entityId, mutationOptions) {
      const data = getData();

      const newEntities = new Map(data.schema.entities);

      const newRoot = new Set(data.schema.root);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      ensureEntityCanLackParent(entity.type, builder);

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

      const newSchema = {
        entities: newEntities,
        root: insertIntoSetAtIndex(newRoot, entityId, mutationOptions?.index),
      };

      events.push({
        name: builderStoreEventsNames.SchemaUpdated,
        payload: {
          schema: serializeInternalBuilderStoreSchema(newSchema),
        },
      });

      setData(
        {
          ...data,
          schema: newSchema,
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

      events.push({
        name: builderStoreEventsNames.SchemaUpdated,
        payload: {
          schema: serializeInternalBuilderStoreSchema(data.schema),
        },
      });

      setData(data, events);
    },
    setEntityAttribute(entityId, attributeName, attributeValue) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityAttributeIsRegistered(
        entity.type,
        attributeName.toString(),
        builder,
      );

      entity.attributes = {
        ...entity.attributes,
        [attributeName]: attributeValue,
      };

      const newSchema = {
        root: data.schema.root,
        entities: data.schema.entities.set(entityId, entity),
      };

      setData(
        {
          ...data,
          schema: newSchema,
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
          {
            name: builderStoreEventsNames.SchemaUpdated,
            payload: {
              schema: serializeInternalBuilderStoreSchema(newSchema),
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

        ensureEntityChildAllowed(parentEntity.type, entity.type, builder);

        parentEntity.children?.delete(entityId);

        parentEntity.children = insertIntoSetAtIndex(
          parentEntity.children ?? new Set(),
          entityId,
          index,
        );

        newEntities.set(entity.parentId, parentEntity);

        const newSchema = {
          ...data.schema,
          entities: newEntities,
        };

        setData(
          {
            ...data,
            schema: newSchema,
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
            {
              name: builderStoreEventsNames.SchemaUpdated,
              payload: {
                schema: serializeInternalBuilderStoreSchema(newSchema),
              },
            },
          ],
        );

        return;
      }

      const newRoot = new Set(data.schema.root);

      newRoot.delete(entityId);

      const newSchema = {
        ...data.schema,
        root: insertIntoSetAtIndex(newRoot, entityId, index),
      };

      setData(
        {
          ...data,
          schema: newSchema,
        },
        [
          {
            name: builderStoreEventsNames.RootUpdated,
            payload: {
              root: serializeInternalBuilderStoreSchemaRoot(newRoot),
            },
          },
          {
            name: builderStoreEventsNames.SchemaUpdated,
            payload: {
              schema: serializeInternalBuilderStoreSchema(newSchema),
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
        builder,
        data,
        serializeInternalBuilderStoreSchema(data.schema),
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
        builder,
      );

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      newEntitiesAttributesErrors.set(entityId, entityAttributesErrors ?? {});

      setData(
        {
          ...data,
          entitiesAttributesErrors: newEntitiesAttributesErrors,
        },
        events,
      );
    },
    async validateEntitiesAttributes() {
      const data = getData();

      const { events, entitiesAttributesErrors } =
        await validateEntitiesAttributes(data, builder);

      setData(
        {
          ...data,
          entitiesAttributesErrors,
        },
        events,
      );
    },
    resetEntityAttributeError(entityId, attributeName) {
      const data = getData();

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityAttributeIsRegistered(
        entity.type,
        attributeName.toString(),
        builder,
      );

      const entityAttributesErrors =
        data.entitiesAttributesErrors.get(entityId);

      delete entityAttributesErrors?.[attributeName];

      if (
        entityAttributesErrors &&
        Object.keys(entityAttributesErrors).length
      ) {
        newEntitiesAttributesErrors.set(entityId, entityAttributesErrors);
      } else {
        newEntitiesAttributesErrors.delete(entityId);
      }

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
            error: undefined,
          }),
        ],
      );
    },
    setEntityAttributeError(entityId, attributeName, error) {
      const data = getData();

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityAttributeIsRegistered(
        entity.type,
        attributeName.toString(),
        builder,
      );

      newEntitiesAttributesErrors.set(entityId, {
        ...data.entitiesAttributesErrors.get(entityId),
        [attributeName]: error,
      });

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
            error,
          }),
        ],
      );
    },
    resetEntityAttributesErrors(entityId) {
      const data = getData();

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      for (const attributeName of Object.keys(
        newEntitiesAttributesErrors.get(entityId) ?? {},
      )) {
        events.push(
          createEntityAttributeErrorUpdatedEvent({
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            attributeName,
            error: undefined,
          }),
        );
      }

      newEntitiesAttributesErrors.delete(entityId);

      setData(
        {
          ...data,
          entitiesAttributesErrors: newEntitiesAttributesErrors,
        },
        events,
      );
    },
    setEntityAttributesErrors(entityId, newEntityAttributesErrors) {
      const data = getData();

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      const entityAttributesErrors =
        data.entitiesAttributesErrors.get(entityId);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityAttributesAreRegistered(
        entity.type,
        Object.keys(newEntityAttributesErrors),
        builder,
      );

      newEntitiesAttributesErrors.set(entityId, newEntityAttributesErrors);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      for (const attributeName of Object.keys(entityAttributesErrors ?? {})) {
        if (
          !newEntityAttributesErrors[
            attributeName as keyof typeof newEntityAttributesErrors
          ]
        ) {
          events.push(
            createEntityAttributeErrorUpdatedEvent({
              entity: {
                ...serializeInternalBuilderStoreEntity(entity),
                id: entityId,
              },
              attributeName,
              error: undefined,
            }),
          );
        }
      }

      for (const [attributeName, error] of Object.entries(
        newEntityAttributesErrors,
      )) {
        events.push(
          createEntityAttributeErrorUpdatedEvent({
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            attributeName,
            error,
          }),
        );
      }

      setData(
        {
          ...data,
          entitiesAttributesErrors: newEntitiesAttributesErrors,
        },
        events,
      );
    },
    resetEntitiesAttributesErrors() {
      const data = getData();

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      for (const [
        entityId,
        entityAttributesErrors,
      ] of data.entitiesAttributesErrors) {
        for (const attributeName of Object.keys(entityAttributesErrors)) {
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
          );
        }
      }

      setData(
        {
          ...data,
          entitiesAttributesErrors: new Map(),
        },
        events,
      );
    },
    setEntitiesAttributesErrors(newEntitiesAttributesErrors) {
      const data = getData();

      const newData = deserializeAndValidateBuilderStoreData(
        {
          schema: serializeInternalBuilderStoreSchema(data.schema),
          entitiesAttributesErrors: newEntitiesAttributesErrors,
          schemaError: data.schemaError,
        },
        builder,
      );

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      for (const [
        entityId,
        entityAttributesErrors,
      ] of data.entitiesAttributesErrors) {
        const newEntityAttributesErrors =
          newData.entitiesAttributesErrors.get(entityId);

        const entity = ensureEntityExists(entityId, data.schema.entities);

        for (const attributeName of Object.keys(entityAttributesErrors)) {
          if (
            !newEntityAttributesErrors?.[
              attributeName as keyof typeof newEntityAttributesErrors
            ]
          ) {
            events.push(
              createEntityAttributeErrorUpdatedEvent({
                entity: {
                  ...serializeInternalBuilderStoreEntity(entity),
                  id: entityId,
                },
                attributeName,
                error: undefined,
              }),
            );
          }
        }
      }

      for (const [
        entityId,
        newEntityAttributesErrors,
      ] of newData.entitiesAttributesErrors) {
        const entity = ensureEntityExists(entityId, data.schema.entities);

        for (const attributeName of Object.keys(newEntityAttributesErrors)) {
          events.push(
            createEntityAttributeErrorUpdatedEvent({
              entity: {
                ...serializeInternalBuilderStoreEntity(entity),
                id: entityId,
              },
              attributeName,
              error:
                newEntityAttributesErrors[
                  attributeName as keyof typeof newEntityAttributesErrors
                ],
            }),
          );
        }
      }

      setData(newData, events);
    },
    cloneEntity(entityId) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const { schema: newSchema, events } = cloneEntity(
        entityId,
        entity,
        data.schema,
        builder,
        {
          index: getEntityIndex(entityId, data.schema) + 1,
          isCloneOrigin: true,
        },
      );

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

      events.push({
        name: builderStoreEventsNames.SchemaUpdated,
        payload: {
          schema: serializeInternalBuilderStoreSchema(newSchema),
        },
      });

      setData(
        {
          ...data,
          schema: newSchema,
        },
        events,
      );
    },
    async validateSchema() {
      const data = getData();

      let events: Array<BuilderStoreEvent<TBuilder>> = [];

      const {
        events: nextEvents,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      } = await validateEntitiesAttributes(data, builder);

      events = events.concat(nextEvents);

      if (newEntitiesAttributesErrors.size) {
        setData(
          {
            ...data,
            entitiesAttributesErrors: newEntitiesAttributesErrors,
          },
          events,
        );

        return {
          success: false,
          reason: {
            code: schemaValidationErrorCodes.InvalidEntitiesAttributes,
            payload: {
              entitiesAttributesErrors:
                serializeInternalBuilderStoreEntitiesAttributesErrors(
                  newEntitiesAttributesErrors,
                ),
            },
          },
        };
      }

      let newSchemaError: unknown = undefined;

      try {
        await builder.validateSchema(
          serializeInternalBuilderStoreSchema(data.schema),
        );

        events.push({
          name: builderStoreEventsNames.SchemaErrorUpdated,
          payload: {
            error: undefined,
          },
        });
      } catch (error) {
        newSchemaError = error;

        events.push({
          name: builderStoreEventsNames.SchemaErrorUpdated,
          payload: {
            error,
          },
        });
      }

      setData(
        {
          ...data,
          entitiesAttributesErrors: newEntitiesAttributesErrors,
          schemaError: newSchemaError,
        },
        events,
      );

      if (newSchemaError) {
        return {
          success: false,
          reason: {
            code: schemaValidationErrorCodes.InvalidSchema,
            payload: {
              schemaError: newSchemaError,
            },
          },
        };
      }

      return {
        success: true,
        data: serializeInternalBuilderStoreSchema(data.schema),
      };
    },
    setSchemaError(schemaError) {
      setData(
        {
          ...getData(),
          schemaError,
        },
        [
          {
            name: builderStoreEventsNames.SchemaErrorUpdated,
            payload: {
              error: schemaError,
            },
          },
        ],
      );
    },
    resetSchemaError() {
      setData(
        {
          ...getData(),
          schemaError: undefined,
        },
        [
          {
            name: builderStoreEventsNames.SchemaErrorUpdated,
            payload: {
              error: undefined,
            },
          },
        ],
      );
    },
    getSchema() {
      return serializeInternalBuilderStoreSchema(getData().schema);
    },
    getEntitiesAttributesErrors() {
      return serializeInternalBuilderStoreEntitiesAttributesErrors(
        getData().entitiesAttributesErrors,
      );
    },
    getSchemaError() {
      return getData().schemaError;
    },
    getEntity(entityId) {
      const entity = getData().schema.entities.get(entityId);

      return entity
        ? {
            ...serializeInternalBuilderStoreEntity(entity),
            id: entityId,
          }
        : null;
    },
  };
}

export type BuilderStore<TBuilder extends Builder = Builder> = {
  getData(): BuilderStoreData<TBuilder>;
  getSchema(): BuilderStoreData<TBuilder>["schema"];
  getEntitiesAttributesErrors(): BuilderStoreData<TBuilder>["entitiesAttributesErrors"];
  getSchemaError(): BuilderStoreData<TBuilder>["schemaError"];
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
  ): SchemaEntityWithId<TBuilder>;
  setEntityParent(
    entityId: string,
    parentId: string,
    options?: { index?: number },
  ): void;
  unsetEntityParent(entityId: string, options?: { index?: number }): void;
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
  validateSchema(): Promise<
    | { data: Schema<TBuilder>; success: true }
    | {
        reason: Extract<
          SchemaValidationErrorReason,
          {
            code: (typeof schemaValidationErrorCodes)["InvalidSchema"];
          }
        >;
        success: false;
      }
    | {
        reason: Extract<
          SchemaValidationErrorReason,
          {
            code: (typeof schemaValidationErrorCodes)["InvalidEntitiesAttributes"];
          }
        >;
        success: false;
      }
  >;
  setSchemaError(error?: unknown): void;
  resetSchemaError(): void;
  getEntity(entityId: string): SchemaEntityWithId<TBuilder> | null;
};
