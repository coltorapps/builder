import {
  Attribute,
  AttributeRefinementResult,
  type AttributeValue,
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
import { type Entity, type EntityAttributesRefinementErrors } from "./entity";
import {
  parseEntityAttributes,
  parseSchema,
  SchemaParsingError,
  SchemaRefinementError,
  schemaRefinementErrorCodes,
  validateEntityAttribute as validateSerializedEntityAttribute,
  type EntitiesAttributesRefinementErrors,
  type ParsedBaseSchemaEntity,
  type ParsedSchema,
  type ParsedSchemaEntity,
  type ParsedSchemaEntityWithId,
  type ValidatedSchema,
} from "./schema";
import { type Subscribe } from "./subscription-manager";
import { insertIntoSetAtIndex, Result } from "./utils";

interface InternalBuilderStoreEntity<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
> extends ParsedBaseSchemaEntity<TEntity, TType> {
  children?: Set<string>;
}

interface InternalBuilderStoreEntityWithId<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
> extends InternalBuilderStoreEntity<TEntity, TType> {
  id: string;
}

interface InternalBuilderStoreData<TBuilder extends Builder = Builder> {
  schema: {
    entities: Map<
      string,
      InternalBuilderStoreEntity<
        TBuilder["entities"][keyof TBuilder["entities"]],
        keyof TBuilder["entities"]
      >
    >;
    root: Set<string>;
  };
  entitiesAttributesErrors: Map<string, EntityAttributesRefinementErrors>;
  schemaError: unknown;
}

export interface BuilderStoreData<TBuilder extends Builder = Builder> {
  schema: ParsedSchema<TBuilder>;
  entitiesAttributesErrors: EntitiesAttributesRefinementErrors<
    TBuilder["entities"]
  >;
  schemaError: unknown;
}

function ensureEntityExists<TBuilder extends Builder>(
  id: string,
  entities: InternalBuilderStoreData<TBuilder>["schema"]["entities"],
): InternalBuilderStoreEntity<
  TBuilder["entities"][keyof TBuilder["entities"]]
> {
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
    TBuilder["entities"][keyof TBuilder["entities"]]
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
    TBuilder["entities"][keyof TBuilder["entities"]]
  >[] = [
    {
      ...entity,
      id: entityId,
    },
  ];

  const childrenDeletionResult = Array.from(entity.children ?? []).reduce<{
    data: InternalBuilderStoreData<TBuilder>;
    deletedEntities: InternalBuilderStoreEntityWithId<
      TBuilder["entities"][keyof TBuilder["entities"]]
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

function ensureEntitiesAttributesErrorsAreValid<TBuilder extends Builder>(
  entitiesAttributesErrors: EntitiesAttributesRefinementErrors<
    TBuilder["entities"]
  >,
  entities: ParsedSchema<TBuilder>["entities"],
  builder: TBuilder,
): EntitiesAttributesRefinementErrors<TBuilder["entities"]> {
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
      Reflect.ownKeys(attributesErrors),
      builder,
    );

    newEntitiesAttributesErrors[entityId] = attributesErrors;
  }

  return newEntitiesAttributesErrors;
}

function serializeInternalBuilderStoreSchemaRoot<TBuilder extends Builder>(
  root: InternalBuilderStoreData<TBuilder>["schema"]["root"],
): ParsedSchema<TBuilder>["root"] {
  return Array.from(root);
}

function serializeInternalBuilderStoreSchema<TBuilder extends Builder>(
  schema: InternalBuilderStoreData<TBuilder>["schema"],
): ParsedSchema<TBuilder> {
  const newEntities: ParsedSchema<TBuilder>["entities"] = {};

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
  return Object.fromEntries(
    entitiesAttributesErrors,
  ) as EntitiesAttributesRefinementErrors<TBuilder["entities"]>;
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
  entity: InternalBuilderStoreEntity<
    TBuilder["entities"][keyof TBuilder["entities"]]
  >,
): ParsedSchemaEntity<
  TBuilder["entities"][keyof TBuilder["entities"]],
  keyof TBuilder["entities"]
> {
  const { children, ...schemaEntity } = entity;

  return {
    ...schemaEntity,
    type: entity.type,
    ...(children ? { children: Array.from(children) } : {}),
    attributes: entity.attributes,
  };
}

function deserializeEntitiesAttributesErrors<TBuilder extends Builder>(
  entitiesAttributesErrors: EntitiesAttributesRefinementErrors<
    TBuilder["entities"]
  >,
): InternalBuilderStoreData<TBuilder>["entitiesAttributesErrors"] {
  return new Map(Object.entries(entitiesAttributesErrors));
}

function deserializeSchema<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder> | ParsedSchema<TBuilder>,
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
  const schemaParsingResult = parseSchema(data.schema, builder);

  if (!schemaParsingResult.success) {
    throw schemaParsingResult.error;
  }

  const validatedEntitiesAttributesErrors =
    ensureEntitiesAttributesErrorsAreValid(
      data.entitiesAttributesErrors,
      schemaParsingResult.data.entities,
      builder,
    );

  return deserializeBuilderStoreData<TBuilder>({
    schema: schemaParsingResult.data,
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
  entity: InternalBuilderStoreEntity<
    TBuilder["entities"][keyof TBuilder["entities"]]
  >,
  schema: InternalBuilderStoreData<TBuilder>["schema"],
  builder: TBuilder,
  options: {
    index?: number;
    isCloneOrigin: boolean;
  },
): {
  schema: InternalBuilderStoreData<TBuilder>["schema"];
  entityClone: InternalBuilderStoreEntityWithId<
    TBuilder["entities"][keyof TBuilder["entities"]]
  >;
} {
  const { schema: schemaWithNewEntity, entity: entityClone } = addEntity(
    {
      ...entity,
      index: options?.index,
      type: entity.type,
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
  TEntity extends
    Builder["entities"][PropertyKey] = Builder["entities"][PropertyKey],
  TType extends PropertyKey = PropertyKey,
> extends Omit<ParsedSchemaEntity<TEntity, TType>, "children"> {
  index?: number;
}

function addEntity<
  TBuilder extends Builder,
  TEntityType extends keyof TBuilder["entities"],
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
    TBuilder["entities"][keyof TBuilder["entities"]],
    TEntityType
  > = {
    attributes: payload.attributes,
    type: payload.type,
    parentId: payload?.parentId,
  };

  ensureEntityAttributesAreRegistered(
    newEntity.type,
    Reflect.ownKeys(newEntity.attributes),
    builder,
  );

  const attributesParsingResult = parseEntityAttributes(
    { ...serializeInternalBuilderStoreEntity(newEntity), id },
    builder,
  );

  if (!attributesParsingResult.success) {
    throw attributesParsingResult.error;
  }

  newEntity.attributes = { ...attributesParsingResult.data };

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

async function validateEntityAttribute<TBuilder extends Builder>(
  entityId: string,
  attributeName: string,
  data: InternalBuilderStoreData<TBuilder>,
  builder: TBuilder,
): Promise<{
  data: InternalBuilderStoreData<TBuilder>;
  result: AttributeRefinementResult<Attribute>;
}> {
  const entity = ensureEntityExists(entityId, data.schema.entities);

  const result = await validateSerializedEntityAttribute(
    { ...serializeInternalBuilderStoreEntity(entity), id: entityId },
    attributeName,
    builder,
    serializeInternalBuilderStoreSchema(data.schema),
  );

  const newEntitiesAttributesErrors = new Map(data.entitiesAttributesErrors);

  if (result.success) {
    newEntitiesAttributesErrors.delete(entityId);

    entity.attributes = {
      ...entity.attributes,
      [attributeName]: result.data,
    };

    const newData = {
      ...data,
      entitiesAttributesErrors: newEntitiesAttributesErrors,
      schema: {
        root: data.schema.root,
        entities: new Map(data.schema.entities).set(entityId, entity),
      },
    };

    return { data: newData, result };
  } else {
    newEntitiesAttributesErrors.set(entityId, {
      [attributeName]: result.error,
    });

    const newData = {
      ...data,
      entitiesAttributesErrors: newEntitiesAttributesErrors,
    };

    return { data: newData, result };
  }
}

async function validateEntityAttributes<TBuilder extends Builder>(
  entityId: string,
  data: InternalBuilderStoreData<TBuilder>,
  builder: TBuilder,
): Promise<InternalBuilderStoreData<TBuilder>> {
  const entity = ensureEntityExists(entityId, data.schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  let newData = data;

  for (const attributeName of Reflect.ownKeys(entityDefinition.attributes)) {
    const validationResult = await validateEntityAttribute(
      entityId,
      attributeName.toString(),
      newData,
      builder,
    );

    newData = validationResult.data;
  }

  return newData;
}

async function validateEntitiesAttributes<TBuilder extends Builder>(
  data: InternalBuilderStoreData<TBuilder>,
  builder: TBuilder,
): Promise<InternalBuilderStoreData<TBuilder>> {
  let currentData = data;

  for (const entityId of data.schema.entities.keys()) {
    currentData = await validateEntityAttributes(
      entityId,
      currentData,
      builder,
    );
  }

  return currentData;
}

export function createBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: {
    initialData?: Partial<BuilderStoreData<TBuilder>>;
  },
):
  | { success: true; builderStore: BuilderStore<TBuilder> }
  | { success: false; error: SchemaParsingError } {
  const initialSchemaParsingResult = parseSchema(
    options?.initialData?.schema ?? { entities: {}, root: [] },
    builder,
  );

  if (!initialSchemaParsingResult.success) {
    return initialSchemaParsingResult;
  }

  const { getData, setData, subscribe } = createDataManager<
    InternalBuilderStoreData<TBuilder>
  >(
    deserializeAndValidateBuilderStoreData(
      {
        schema: initialSchemaParsingResult.data,
        entitiesAttributesErrors:
          options?.initialData?.entitiesAttributesErrors ??
          ({} as EntitiesAttributesRefinementErrors<TBuilder["entities"]>),
        schemaError: options?.initialData?.schemaError,
      },
      builder,
    ),
  );

  const builderStore: BuilderStore<TBuilder> = {
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

      const { schema, entity } = addEntity(
        { ...payload, attributes: payload.attributes ?? {} },
        data.schema,
        builder,
      );

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
    setEntityAttributeValue(entityId, attributeName, attributeValue) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const attributeDefinition = ensureEntityAttributeIsRegistered(
        entity.type,
        attributeName,
        builder,
      );

      const attributeParsingResult = attributeDefinition.validate[0](
        attributeValue,
        {
          attribute: {
            metadata: attributeDefinition.metadata,
            name: attributeName,
          },
        },
      );

      if (!attributeParsingResult.success) {
        throw attributeParsingResult.error;
      }

      entity.attributes = {
        ...entity.attributes,
        [attributeName]: attributeParsingResult.data,
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
    async validateEntityAttribute(entityId, attributeName) {
      const data = getData();

      const validationResult = await validateEntityAttribute(
        entityId,
        attributeName,
        data,
        builder,
      );

      setData(validationResult.data);

      return validationResult.result;
    },
    async validateEntityAttributes(entityId) {
      const data = getData();

      const newData = await validateEntityAttributes(entityId, data, builder);

      setData(newData);
    },
    async validateEntitiesAttributes() {
      const data = getData();

      const newData = await validateEntitiesAttributes(data, builder);

      setData(newData);
    },
    clearEntityAttributeError(entityId, attributeName) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

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
        Reflect.ownKeys(entityAttributesErrors).length
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
    setEntityAttributeError(entityId, attributeName, error) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

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
      } as EntityAttributesRefinementErrors);

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });
    },
    clearEntityAttributesErrors(entityId) {
      const data = getData();

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      ensureEntityExists(entityId, data.schema.entities);

      newEntitiesAttributesErrors.delete(entityId);

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });
    },
    setEntityAttributesErrors(entityId, newEntityAttributesErrors) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const newEntitiesAttributesErrors = new Map(
        data.entitiesAttributesErrors,
      );

      ensureEntityAttributesAreRegistered(
        entity.type,
        Reflect.ownKeys(newEntityAttributesErrors),
        builder,
      );

      newEntitiesAttributesErrors.set(entityId, newEntityAttributesErrors);

      setData({
        ...data,
        entitiesAttributesErrors: newEntitiesAttributesErrors,
      });
    },
    clearEntitiesAttributesErrors() {
      const data = getData();

      setData({
        ...data,
        entitiesAttributesErrors: new Map(),
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

      const { schema: newSchema } = cloneEntity(entity, data.schema, builder, {
        index: getEntityIndex(entityId, data.schema) + 1,
        isCloneOrigin: true,
      });

      setData({
        ...data,
        schema: newSchema,
      });
    },
    async validateSchema() {
      const newData = await validateEntitiesAttributes(getData(), builder);

      if (newData.entitiesAttributesErrors.size) {
        setData(newData);

        return {
          success: false,
          error: new SchemaRefinementError(
            "Refining has failed for some entities attributes.",
            {
              code: schemaRefinementErrorCodes.AttributesRefinementFailed,
              payload: {
                entitiesAttributesErrors:
                  serializeInternalBuilderStoreEntitiesAttributesErrors(
                    newData.entitiesAttributesErrors,
                  ),
              },
            },
          ),
        };
      }

      const schemaRefinementResult = await builder.refineSchema(
        serializeInternalBuilderStoreSchema(newData.schema) as ValidatedSchema,
      );

      if (!schemaRefinementResult.success) {
        setData({
          ...newData,
          schemaError: schemaRefinementResult.error,
        });

        return {
          success: false,
          error: new SchemaRefinementError("Schema refinement has failed.", {
            code: schemaRefinementErrorCodes.SchemaRefinementFailed,
            payload: { schemaError: schemaRefinementResult.error },
          }),
        };
      }

      setData({
        ...newData,
        schema: deserializeSchema(
          schemaRefinementResult.data as ParsedSchema<TBuilder>,
        ),
        schemaError: undefined,
      });

      return {
        success: true,
        data: schemaRefinementResult.data as ValidatedSchema<TBuilder>,
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
          }
        : null;
    },
  };

  return {
    success: true,
    builderStore,
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
  addEntity<TEntityType extends keyof TBuilder["entities"]>(
    payload: Omit<
      AddEntityPayload<TBuilder["entities"][TEntityType], TEntityType>,
      "attributes"
    > & {
      attributes?: AddEntityPayload<
        TBuilder["entities"][TEntityType],
        TEntityType
      >["attributes"];
    },
  ): ParsedSchemaEntityWithId<TBuilder["entities"][TEntityType], TEntityType>;
  setEntityParent(
    entityId: string,
    parentId: string,
    options?: { index?: number },
  ): void;
  unsetEntityParent(entityId: string, options?: { index?: number }): void;
  setEntityIndex(entityId: string, index: number): void;
  setEntityAttributeValue(
    entityId: string,
    attributeName: string,
    attributeValue: unknown,
  ): void;
  deleteEntity(entityId: string): void;
  validateEntityAttribute(
    entityId: string,
    attributeName: string,
  ): Promise<AttributeRefinementResult<Attribute>>;
  validateEntityAttributes(entityId: string): Promise<void>;
  validateEntitiesAttributes(): Promise<void>;
  clearEntityAttributeError(entityId: string, attributeName: string): void;
  setEntityAttributeError(
    entityId: string,
    attributeName: string,
    error?: unknown,
  ): void;
  clearEntityAttributesErrors(entityId: string): void;
  setEntityAttributesErrors(
    entityId: string,
    entityAttributesErrors: Record<PropertyKey, unknown>,
  ): void;
  clearEntitiesAttributesErrors(): void;
  setEntitiesAttributesErrors(
    entitiesAttributesErrors: EntitiesAttributesRefinementErrors<
      TBuilder["entities"]
    >,
  ): void;
  cloneEntity(entityId: string): void;
  validateSchema(): Promise<
    Result<
      ValidatedSchema<TBuilder>,
      SchemaParsingError | SchemaRefinementError<TBuilder>
    >
  >;
  setSchemaError(error?: unknown): void;
  resetSchemaError(): void;
  getEntity(entityId: string):
    | {
        [K in keyof TBuilder["entities"]]: ParsedSchemaEntityWithId<
          TBuilder["entities"][K],
          K
        >;
      }[keyof TBuilder["entities"]]
    | null;
}
