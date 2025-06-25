import {
  type AttributeValue,
  type AttributeValueValidationResult,
} from "./attribute";
import {
  ensureEntityAttributeIsRegistered,
  ensureEntityAttributesAreRegistered,
  ensureEntityCanLackParent,
  ensureEntityChildAllowed,
  ensureEntityIsRegistered,
  ensureEntityParentAllowed,
  type Builder,
} from "./builder";
import { createDataManager } from "./data-manager";
import {
  ensureEntityTypeMatches,
  type Entity,
  type EntityAttributesErrors,
} from "./entity";
import {
  SchemaValidationError,
  schemaValidationErrorCodes,
  validateSchemaShape,
  type BaseSchemaEntity,
  type EntitiesAttributesErrors,
  type Schema,
  type SchemaEntity,
  type SchemaEntityWithId,
  type SchemaValidationErrorReason,
} from "./schema";
import { type Subscribe, type SubscriptionEvent } from "./subscription-manager";
import { insertIntoSetAtIndex, type ExtractStringKeys } from "./utils";

interface InternalBuilderStoreEntity<
  TEntity extends Entity = Entity,
  TType extends string = string,
> extends BaseSchemaEntity<TEntity, TType> {
  children?: Set<string>;
}

interface InternalBuilderStoreEntityWithId<
  TEntity extends Entity = Entity,
  TType extends string = string,
> extends InternalBuilderStoreEntity<TEntity, TType> {
  id: string;
}

interface InternalBuilderStoreData<TBuilder extends Builder = Builder> {
  schema: {
    entities: Map<
      string,
      InternalBuilderStoreEntity<TBuilder["entities"][string]>
    >;
    root: Set<string>;
  };
  entitiesAttributesErrors: Map<string, EntityAttributesErrors>;
  schemaError: unknown;
}

export interface BuilderStoreData<TBuilder extends Builder = Builder> {
  schema: Schema<TBuilder>;
  entitiesAttributesErrors: EntitiesAttributesErrors;
  schemaError: unknown;
}

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

type EntityWithUpdatedAttributeName<TBuilder extends Builder> = {
  [K in ExtractStringKeys<TBuilder["entities"]>]: SchemaEntityWithId<
    TBuilder["entities"][K],
    K
  > & {
    updatedAttributeName: keyof SchemaEntityWithId<
      TBuilder["entities"][K],
      K
    >["attributes"] &
      string;
  };
}[ExtractStringKeys<TBuilder["entities"]>];

export type BuilderStoreEvent<TBuilder extends Builder = Builder> =
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityAdded,
      {
        entity: SchemaEntityWithId<TBuilder["entities"][string]>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityUpdated,
      {
        entity: SchemaEntityWithId<TBuilder["entities"][string]>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityAttributeUpdated,
      {
        entity: EntityWithUpdatedAttributeName<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityDeleted,
      {
        entity: SchemaEntityWithId<TBuilder["entities"][string]>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityCloned,
      {
        entity: {
          [K in ExtractStringKeys<TBuilder["entities"]>]: SchemaEntityWithId<
            TBuilder["entities"][K],
            K
          > & {
            clone: SchemaEntityWithId<TBuilder["entities"][K], K>;
            isCloneOrigin: boolean;
          };
        }[ExtractStringKeys<TBuilder["entities"]>];
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
        entity: EntityWithUpdatedAttributeName<TBuilder>;
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
): InternalBuilderStoreEntity<TBuilder["entities"][string]> {
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
  deletedEntities: InternalBuilderStoreEntityWithId<
    TBuilder["entities"][string]
  >[];
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

  let deletedEntities: InternalBuilderStoreEntityWithId<
    TBuilder["entities"][string]
  >[] = [
    {
      ...entity,
      id: entityId,
    },
  ];

  const childrenDeletionResult = Array.from(entity.children ?? []).reduce<{
    data: InternalBuilderStoreData<TBuilder>;
    deletedEntities: InternalBuilderStoreEntityWithId<
      TBuilder["entities"][string]
    >[];
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

  const entityAttributesErrors = newEntitiesAttributesErrors.get(entityId);

  try {
    const attributeValue =
      entity.attributes[attributeName as keyof typeof entity.attributes];

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
      attributeName
    ]?.validate
      ? (value: unknown) =>
          entityDefinition.attributesExtensions[attributeName]?.validate?.(
            value,
            {
              ...attributeValidationContext,
              validate: attributeValidator,
            },
          )
      : undefined;

    const entityExtensionAttributeValidator = builder.entitiesExtensions[
      entity.type
    ]?.attributes?.[attributeName]?.validate?.bind(
      builder.entitiesExtensions[entity.type]?.attributes?.[attributeName],
    );

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

    delete entityAttributesErrors?.[attributeName];

    if (entityAttributesErrors) {
      newEntitiesAttributesErrors.set(entityId, entityAttributesErrors);
    }
  } catch (error) {
    newEntitiesAttributesErrors.set(entityId, {
      ...entityAttributesErrors,
      [attributeName]: error,
    } as EntityAttributesErrors);
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
  entity: SchemaEntityWithId<TBuilder["entities"][string]>;
  attributeName: string;
  error: unknown;
}): Extract<
  BuilderStoreEvent<TBuilder>,
  { name: typeof builderStoreEventsNames.EntityAttributeErrorUpdated }
> {
  return {
    name: builderStoreEventsNames.EntityAttributeErrorUpdated,
    payload: {
      entity: {
        ...options.entity,
        type: options.entity.type as ExtractStringKeys<TBuilder["entities"]>,
        updatedAttributeName: options.attributeName,
      },
      error: options.error,
    },
  };
}

async function validateEntityAttributes<TBuilder extends Builder>(
  entityId: string,
  data: InternalBuilderStoreData<TBuilder>,
  builder: TBuilder,
): Promise<{
  entityAttributesErrors: EntityAttributesErrors | undefined;
  events: Array<BuilderStoreEvent<TBuilder>>;
}> {
  let newEntitiesAttributesErrors = new Map(data.entitiesAttributesErrors);

  const entity = ensureEntityExists(entityId, data.schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const events: Array<BuilderStoreEvent<TBuilder>> = [];

  const schema = serializeInternalBuilderStoreSchema(data.schema);

  for (const attributeName in entityDefinition.attributes) {
    newEntitiesAttributesErrors = await validateEntityAttribute(
      entityId,
      attributeName,
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
        attributeName: attributeName,
        error: newEntitiesAttributesErrors.get(entityId)?.[attributeName],
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
  entitiesAttributesErrors: EntitiesAttributesErrors,
  entities: Schema<TBuilder>["entities"],
  builder: TBuilder,
): EntitiesAttributesErrors {
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
  const newEntities: Schema<TBuilder>["entities"] = {};

  for (const [id, entity] of schema.entities) {
    newEntities[id] = serializeInternalBuilderStoreEntity(
      entity,
    ) as Schema<TBuilder>["entities"][string];
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
  entity: InternalBuilderStoreEntity<TBuilder["entities"][string]>,
): SchemaEntity<
  TBuilder["entities"][string],
  ExtractStringKeys<TBuilder["entities"]>
> {
  const { children, ...schemaEntity } = entity;

  return {
    ...schemaEntity,
    type: entity.type as ExtractStringKeys<TBuilder["entities"]>,
    ...(children ? { children: Array.from(children) } : {}),
    attributes: entity.attributes,
  };
}

function deserializeEntitiesAttributesErrors<TBuilder extends Builder>(
  entitiesAttributesErrors: EntitiesAttributesErrors<TBuilder["entities"]>,
): InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"] {
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
          ...(entity.children
            ? { children: new Set(entity.children) }
            : { children: undefined }),
          attributes: entity.attributes,
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
  entity: InternalBuilderStoreEntity<TBuilder["entities"][string]>,
  schema: InternalBuilderStoreData<TBuilder>["schema"],
  builder: TBuilder,
  options: {
    index?: number;
    isCloneOrigin: boolean;
  },
): {
  schema: InternalBuilderStoreData<TBuilder>["schema"];
  entityClone: InternalBuilderStoreEntityWithId<TBuilder["entities"][string]>;
  events: Array<BuilderStoreEvent<TBuilder>>;
} {
  const { schema: schemaWithNewEntity, entity: entityClone } = addEntity(
    {
      ...entity,
      index: options?.index,
      type: entity.type as ExtractStringKeys<TBuilder["entities"]>,
    },
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
    isCloneOrigin: options.isCloneOrigin,
    clone: {
      ...serializeInternalBuilderStoreEntity(entityClone),
      id: entityClone.id,
    },
  };

  events.unshift({
    name: builderStoreEventsNames.EntityCloned,
    payload: {
      entity: serializedEntity,
    },
  });

  return { schema: newSchema, entityClone, events };
}

interface AddEntityPayload<
  TEntity extends Builder["entities"][string] = Builder["entities"][string],
  TType extends string = string,
> extends InternalBuilderStoreEntity<TEntity, TType> {
  index?: number;
}

function addEntity<
  TBuilder extends Builder,
  TEntityType extends ExtractStringKeys<TBuilder["entities"]>,
>(
  payload: AddEntityPayload<TBuilder["entities"][TEntityType], TEntityType>,
  schema: InternalBuilderStoreData<TBuilder>["schema"],
  builder: TBuilder,
): {
  schema: InternalBuilderStoreData<TBuilder>["schema"];
  entity: InternalBuilderStoreEntityWithId<
    TBuilder["entities"][TEntityType],
    TEntityType
  >;
} {
  const id = builder.generateEntityId();

  builder.validateEntityId(id);

  if (schema.entities.has(id)) {
    throw new Error(`An entitiy with the ID "${id}" already exists.`);
  }

  const newEntity: InternalBuilderStoreEntity<
    TBuilder["entities"][string],
    TEntityType
  > = {
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
        type: payload.type,
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
    setEntityAttribute(
      entityId: string,
      attributeName: string,
      attributeValue: unknown,
      entityType?: string,
    ) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (entityType) {
        ensureEntityTypeMatches({ ...entity, id: entityId }, entityType);
      }

      ensureEntityAttributeIsRegistered(entity.type, attributeName, builder);

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
                updatedAttributeName: attributeName,
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
    async validateEntityAttribute(
      entityId: string,
      attributeName: string,
      entityType?: string,
    ) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (entityType) {
        ensureEntityTypeMatches({ ...entity, id: entityId }, entityType);
      }

      const newEntitiesAttributesErrors = await validateEntityAttribute(
        entityId,
        attributeName,
        builder,
        data,
        serializeInternalBuilderStoreSchema(data.schema),
      );

      const attributeError =
        newEntitiesAttributesErrors.get(entityId)?.[attributeName];

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
            error: attributeError,
          }),
        ],
      );

      if (attributeError) {
        return {
          success: false as const,
          error: attributeError,
        };
      }

      return {
        success: true as const,
        data: entity.attributes[
          attributeName as keyof typeof entity.attributes
        ],
      };
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
    resetEntityAttributeError(
      entityId: string,
      attributeName: string,
      entityType?: undefined,
    ) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (entityType) {
        ensureEntityTypeMatches({ ...entity, id: entityId }, entityType);
      }

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      ensureEntityAttributeIsRegistered(entity.type, attributeName, builder);

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
            attributeName: attributeName.toString(),
            error: undefined,
          }),
        ],
      );
    },
    setEntityAttributeError(
      entityId: string,
      attributeName: string,
      error?: unknown,
      entityType?: string,
    ) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (entityType) {
        ensureEntityTypeMatches({ ...entity, id: entityId }, entityType);
      }

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      ensureEntityAttributeIsRegistered(
        entity.type,
        attributeName.toString(),
        builder,
      );

      newEntitiesAttributesErrors.set(entityId, {
        ...(data.entitiesAttributesErrors.get(entityId) ?? {}),
        [attributeName]: error,
      } as EntityAttributesErrors);

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
            attributeName: attributeName.toString(),
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
    setEntityAttributesErrors(
      entityId: string,
      newEntityAttributesErrors: Record<string, unknown>,
      entityType?: undefined,
    ) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (entityType) {
        ensureEntityTypeMatches({ ...entity, id: entityId }, entityType);
      }

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      const entityAttributesErrors =
        data.entitiesAttributesErrors.get(entityId);

      ensureEntityAttributesAreRegistered(
        entity.type,
        Object.keys(newEntityAttributesErrors),
        builder,
      );

      newEntitiesAttributesErrors.set(entityId, newEntityAttributesErrors);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      for (const attributeName of Object.keys(entityAttributesErrors ?? {})) {
        if (!newEntityAttributesErrors[attributeName]) {
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
          if (!newEntityAttributesErrors?.[attributeName]) {
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
              error: newEntityAttributesErrors[attributeName],
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
            type: entity.type as ExtractStringKeys<TBuilder["entities"]>,
          }
        : null;
    },
  };
}

export interface BuilderStore<TBuilder extends Builder = Builder> {
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
  addEntity<TEntityType extends ExtractStringKeys<TBuilder["entities"]>>(
    payload: AddEntityPayload<TBuilder["entities"][TEntityType], TEntityType>,
  ): SchemaEntityWithId<TBuilder["entities"][TEntityType], TEntityType>;
  setEntityParent(
    entityId: string,
    parentId: string,
    options?: { index?: number },
  ): void;
  unsetEntityParent(entityId: string, options?: { index?: number }): void;
  setEntityIndex(entityId: string, index: number): void;
  setEntityAttribute<
    TEntityType extends ExtractStringKeys<TBuilder["entities"]>,
    TAttributeName extends ExtractStringKeys<
      TBuilder["entities"][TEntityType]["attributes"]
    >,
  >(
    entityId: string,
    attributeName: TAttributeName,
    attributeValue: AttributeValue<
      TBuilder["entities"][TEntityType]["attributes"][TAttributeName]
    >,
    entityType: TEntityType,
  ): void;
  setEntityAttribute(
    entityId: string,
    attributeName: string,
    attributeValue: unknown,
    entityType?: undefined,
  ): void;
  deleteEntity(entityId: string): void;
  validateEntityAttribute<
    TEntityType extends ExtractStringKeys<TBuilder["entities"]>,
    TAttributeName extends ExtractStringKeys<
      TBuilder["entities"][TEntityType]["attributes"]
    >,
  >(
    entityId: string,
    attributeName: TAttributeName,
    entityType: TEntityType,
  ): Promise<
    AttributeValueValidationResult<
      TBuilder["entities"][TEntityType]["attributes"][TAttributeName]
    >
  >;
  validateEntityAttribute(
    entityId: string,
    attributeName: string,
    entityType?: undefined,
  ): Promise<AttributeValueValidationResult>;
  validateEntityAttributes(entityId: string): Promise<void>;
  validateEntitiesAttributes(): Promise<void>;
  resetEntityAttributeError<
    TEntityType extends ExtractStringKeys<TBuilder["entities"]>,
    TAttributeName extends ExtractStringKeys<
      TBuilder["entities"][TEntityType]["attributes"]
    >,
  >(
    entityId: string,
    attributeName: TAttributeName,
    entityType: TEntityType,
  ): void;
  resetEntityAttributeError(
    entityId: string,
    attributeName: string,
    entityType?: undefined,
  ): void;
  setEntityAttributeError<
    TEntityType extends ExtractStringKeys<TBuilder["entities"]>,
    TAttributeName extends ExtractStringKeys<
      TBuilder["entities"][TEntityType]["attributes"]
    >,
  >(
    entityId: string,
    attributeName: TAttributeName,
    error: unknown,
    entityType: TEntityType,
  ): void;
  setEntityAttributeError(
    entityId: string,
    attributeName: string,
    error?: unknown,
    entityType?: undefined,
  ): void;
  resetEntityAttributesErrors(entityId: string): void;
  setEntityAttributesErrors<
    TEntityType extends ExtractStringKeys<TBuilder["entities"]>,
  >(
    entityId: string,
    entityAttributesErrors: EntityAttributesErrors<
      TBuilder["entities"][TEntityType]
    >,
    entityType: TEntityType,
  ): void;
  setEntityAttributesErrors(
    entityId: string,
    entityAttributesErrors: Record<string, unknown>,
    entityType?: undefined,
  ): void;
  resetEntitiesAttributesErrors(): void;
  setEntitiesAttributesErrors(
    entitiesAttributesErrors: EntitiesAttributesErrors<TBuilder["entities"]>,
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
  getEntity(entityId: string):
    | {
        [K in keyof TBuilder["entities"]]: SchemaEntityWithId<
          TBuilder["entities"][K],
          Extract<K, string>
        >;
      }[keyof TBuilder["entities"]]
    | null;
}
