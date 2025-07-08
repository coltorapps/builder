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
import { type Subscribe } from "./subscription-manager";
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

function ensureEntityExists<TBuilder extends Builder>(
  id: string,
  entities: InternalBuilderStoreData<TBuilder>["schema"]["entities"],
): InternalBuilderStoreEntity<TBuilder["entities"][string]> {
  const entity = entities.get(id);

  if (!entity) {
    throw new Error(`Entity with ID "${id}" was not found.`);
  }

  const entityClone = { ...entity, attributes: { ...entity.attributes } };

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
      root: new Set(data.schema.root),
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

  const entityAttributesErrors = {
    ...newEntitiesAttributesErrors.get(entityId),
  };

  try {
    const attributeValue =
      entity.attributes[attributeName as keyof typeof entity.attributes];

    const serializedEntity = {
      ...serializeInternalBuilderStoreEntity(entity),
      id: entityId,
      metadata: entityDefinition.metadata,
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

async function validateEntityAttributes<TBuilder extends Builder>(
  entityId: string,
  data: InternalBuilderStoreData<TBuilder>,
  builder: TBuilder,
): Promise<{
  entityAttributesErrors: EntityAttributesErrors | undefined;
}> {
  let newEntitiesAttributesErrors = new Map(data.entitiesAttributesErrors);

  const entity = ensureEntityExists(entityId, data.schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

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
  }

  return {
    entityAttributesErrors: newEntitiesAttributesErrors.get(entityId),
  };
}

async function validateEntitiesAttributes<TBuilder extends Builder>(
  data: InternalBuilderStoreData<TBuilder>,
  builder: TBuilder,
): Promise<{
  entitiesAttributesErrors: InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"];
}> {
  const newEntitiesAttributesErrors = new Map(data.entitiesAttributesErrors);

  for (const entityId of Array.from(data.schema.entities.keys())) {
    const { entityAttributesErrors } = await validateEntityAttributes(
      entityId,
      data,
      builder,
    );

    if (entityAttributesErrors) {
      newEntitiesAttributesErrors.set(entityId, entityAttributesErrors);
    } else {
      newEntitiesAttributesErrors.delete(entityId);
    }
  }

  return {
    entitiesAttributesErrors: newEntitiesAttributesErrors,
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
      throw new Error(`Entity with ID "${entityId}" could not be found.`);
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
    }
  }

  return { schema: newSchema, entityClone };
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
    throw new Error(`An entity with the ID "${id}" already exists.`);
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
  grandParentId: string,
  entityId: string,
  entities: InternalBuilderStoreData["schema"]["entities"],
): boolean {
  const entity = ensureEntityExists(entityId, entities);

  if (!entity.parentId) {
    return false;
  }

  if (grandParentId === entity.parentId) {
    throw new Error(
      `Entity with ID "${grandParentId}" is a direct child of entity "${entityId}".`,
    );
  }

  return ensureEntityNotGrandparent(grandParentId, entity.parentId, entities);
}

export function createBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: {
    initialData?: Partial<BuilderStoreData<TBuilder>>;
  },
): BuilderStore<TBuilder> {
  const { getData, setData, subscribe } = createDataManager<
    InternalBuilderStoreData<TBuilder>
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
      return subscribe((data, prevData) =>
        listener(
          serializeInternalBuilderStoreData(data),
          serializeInternalBuilderStoreData(prevData),
        ),
      );
    },
    getData() {
      return serializeInternalBuilderStoreData(getData());
    },
    setData(data) {
      const newData = deserializeAndValidateBuilderStoreData(data, builder);

      setData(newData);
    },
    addEntity(payload) {
      const data = getData();

      const { schema, entity } = addEntity(payload, data.schema, builder);

      setData({
        ...data,
        schema,
      });

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

      if (entity.parentId) {
        const oldParentEntity = ensureEntityExists(
          entity.parentId,
          data.schema.entities,
        );

        oldParentEntity.children?.delete(entityId);

        newEntities.set(entity.parentId, oldParentEntity);
      } else {
        newRoot.delete(entityId);
      }

      entity.parentId = parentId;

      newEntities.set(entityId, entity);

      ensureEntityChildAllowed(newParentEntity.type, entity.type, builder);

      newParentEntity.children = insertIntoSetAtIndex(
        newParentEntity.children ?? new Set(),
        entityId,
        mutationOptions?.index,
      );

      newEntities.set(parentId, newParentEntity);

      setData({
        ...data,
        schema: {
          entities: newEntities,
          root: newRoot,
        },
      });
    },
    unsetEntityParent(entityId, mutationOptions) {
      const data = getData();

      const newEntities = new Map(data.schema.entities);

      const newRoot = new Set(data.schema.root);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityCanLackParent(entity.type, builder);

      if (entity.parentId) {
        const oldParentEntity = ensureEntityExists(
          entity.parentId,
          data.schema.entities,
        );

        oldParentEntity.children?.delete(entityId);

        newEntities.set(entity.parentId, oldParentEntity);
      }

      newRoot.delete(entityId);

      delete entity.parentId;

      newEntities.set(entityId, entity);

      const newSchema = {
        entities: newEntities,
        root: insertIntoSetAtIndex(newRoot, entityId, mutationOptions?.index),
      };

      setData({
        ...data,
        schema: newSchema,
      });
    },
    deleteEntity(entityId) {
      const { data } = deleteEntity(entityId, getData());

      setData(data);
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
        entities: new Map(data.schema.entities).set(entityId, entity),
      };

      setData({
        ...data,
        schema: newSchema,
      });
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

        setData({
          ...data,
          schema: newSchema,
        });

        return;
      }

      const newRoot = new Set(data.schema.root);

      newRoot.delete(entityId);

      const newSchema = {
        ...data.schema,
        root: insertIntoSetAtIndex(newRoot, entityId, index),
      };

      setData({
        ...data,
        schema: newSchema,
      });
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

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });

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

      const { entityAttributesErrors } = await validateEntityAttributes(
        entityId,
        data,
        builder,
      );

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      newEntitiesAttributesErrors.set(entityId, entityAttributesErrors ?? {});

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });
    },
    async validateEntitiesAttributes() {
      const data = getData();

      const { entitiesAttributesErrors } = await validateEntitiesAttributes(
        data,
        builder,
      );

      setData({
        ...data,
        entitiesAttributesErrors,
      });
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

      const entityAttributesErrors = {
        ...data.entitiesAttributesErrors.get(entityId),
      };

      delete entityAttributesErrors?.[attributeName];

      if (
        entityAttributesErrors &&
        Object.keys(entityAttributesErrors).length
      ) {
        newEntitiesAttributesErrors.set(entityId, entityAttributesErrors);
      } else {
        newEntitiesAttributesErrors.delete(entityId);
      }

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });
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

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });
    },
    resetEntityAttributesErrors(entityId) {
      const data = getData();

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      ensureEntityExists(entityId, data.schema.entities);

      for (const attributeName of Object.keys(
        newEntitiesAttributesErrors.get(entityId) ?? {},
      )) {
        newEntitiesAttributesErrors.set(entityId, {
          ...(newEntitiesAttributesErrors.get(entityId) ?? {}),
          [attributeName]: undefined,
        } as EntityAttributesErrors);
      }

      newEntitiesAttributesErrors.delete(entityId);

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });
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

      ensureEntityAttributesAreRegistered(
        entity.type,
        Object.keys(newEntityAttributesErrors),
        builder,
      );

      newEntitiesAttributesErrors.set(entityId, newEntityAttributesErrors);

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });
    },
    resetEntitiesAttributesErrors() {
      const data = getData();

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      for (const [
        entityId,
        entityAttributesErrors,
      ] of data.entitiesAttributesErrors) {
        for (const attributeName of Object.keys(entityAttributesErrors)) {
          newEntitiesAttributesErrors.set(entityId, {
            ...(newEntitiesAttributesErrors.get(entityId) ?? {}),
            [attributeName]: undefined,
          } as EntityAttributesErrors);
        }
      }

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });
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

      setData(newData);
    },
    cloneEntity(entityId) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const { schema: newSchema } = cloneEntity(
        entityId,
        entity,
        data.schema,
        builder,
        {
          index: getEntityIndex(entityId, data.schema) + 1,
          isCloneOrigin: true,
        },
      );

      setData({
        ...data,
        schema: newSchema,
      });
    },
    async validateSchema() {
      const data = getData();

      const { entitiesAttributesErrors: newEntitiesAttributesErrors } =
        await validateEntitiesAttributes(data, builder);

      if (newEntitiesAttributesErrors.size) {
        setData({
          ...data,
          entitiesAttributesErrors: newEntitiesAttributesErrors,
        });

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
      } catch (error) {
        newSchemaError = error;
      }

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
        schemaError: newSchemaError,
      });

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
      setData({
        ...getData(),
        schemaError,
      });
    },
    resetSchemaError() {
      setData({
        ...getData(),
        schemaError: undefined,
      });
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
    ...args: Parameters<Subscribe<BuilderStoreData<TBuilder>>>
  ): ReturnType<Subscribe<BuilderStoreData<TBuilder>>>;
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
