import { Attribute, AttributeRefinementContext } from "./attribute";
import {
  BuilderSchemaRefinementError,
  getEntityDefinition,
  isEntityChildAllowed,
  isEntityParentAllowed,
  isEntityParentRequired,
  type Builder,
} from "./builder";
import {
  computeContextEntity,
  type Entity,
  type EntityAttributesRefinementErrors,
  type EntityAttributesValues,
} from "./entity";
import { type Result } from "./utils";

export const schemaParsingErrorCodes = {
  MalformedSchema: "MalformedSchema",
  AttributesParsingFailed: "AttributesParsingFailed",
  ChildNotAllowed: "ChildNotAllowed",
  ParentRequired: "ParentRequired",
  ParentNotAllowed: "ParentNotAllowed",
} as const;

export type SchemaParsingErrorCode =
  (typeof schemaParsingErrorCodes)[keyof typeof schemaParsingErrorCodes];

export type SchemaParsingErrorReason =
  | {
      code: typeof schemaParsingErrorCodes.MalformedSchema;
      payload?: unknown;
    }
  | {
      code: typeof schemaParsingErrorCodes.AttributesParsingFailed;
      payload: {
        entitiesAttributesErrors: Record<string, Record<PropertyKey, unknown>>;
      };
    }
  | {
      code: typeof schemaParsingErrorCodes.ChildNotAllowed;
      payload: { entityId: string; childId: string };
    }
  | {
      code: typeof schemaParsingErrorCodes.ParentRequired;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaParsingErrorCodes.ParentNotAllowed;
      payload: { entityId: string; parentId: string };
    };

export class SchemaParsingError extends Error {
  constructor(
    message: string,
    public reason: SchemaParsingErrorReason,
  ) {
    super(message ?? "Unknown error");
  }
}

export const schemaRefinementErrorCodes = {
  AttributesRefinementFailed: "AttributesRefinementFailed",
  SchemaRefinementFailed: "SchemaRefinementFailed",
} as const;

export type SchemaRefinementErrorCode =
  (typeof schemaRefinementErrorCodes)[keyof typeof schemaRefinementErrorCodes];

export type SchemaRefinementErrorReason<TBuilder extends Builder> =
  | {
      code: typeof schemaRefinementErrorCodes.AttributesRefinementFailed;
      payload: {
        entitiesAttributesErrors: EntitiesAttributesRefinementErrors<
          TBuilder["entities"]
        >;
      };
    }
  | {
      code: typeof schemaRefinementErrorCodes.SchemaRefinementFailed;
      payload: {
        schemaError: BuilderSchemaRefinementError<TBuilder>;
      };
    };

export class SchemaRefinementError<TBuilder extends Builder> extends Error {
  constructor(
    message: string,
    public reason: SchemaRefinementErrorReason<TBuilder>,
  ) {
    super(message ?? "Unknown error");
  }
}

export interface ParsedBaseSchemaEntity<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
> {
  type: TType;
  attributes: Partial<EntityAttributesValues<TEntity>>;
  parentId?: string;
}

export interface ParsedSchemaEntity<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
> extends ParsedBaseSchemaEntity<TEntity, TType> {
  children?: ReadonlyArray<string>;
}

export interface ParsedSchemaEntityWithId<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
> extends ParsedSchemaEntity<TEntity, TType> {
  id: string;
}

export interface ParsedSchema<
  TBuilder extends Pick<Builder, "entities"> = Pick<Builder, "entities">,
> {
  entities: Record<
    string,
    {
      [K in keyof TBuilder["entities"]]: ParsedSchemaEntity<
        TBuilder["entities"][K],
        K
      >;
    }[keyof TBuilder["entities"]]
  >;
  root: ReadonlyArray<string>;
}

export interface ValidatedBaseSchemaEntity<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
> {
  type: TType;
  attributes: EntityAttributesValues<TEntity>;
  parentId?: string;
}

export interface ValidatedSchemaEntity<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
> extends ValidatedBaseSchemaEntity<TEntity, TType> {
  children?: ReadonlyArray<string>;
}

export interface ValidatedSchemaEntityWithId<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
> extends ValidatedSchemaEntity<TEntity, TType> {
  id: string;
}

export interface ValidatedSchema<
  TBuilder extends Pick<Builder, "entities"> = Pick<Builder, "entities">,
> {
  entities: Record<
    string,
    {
      [K in keyof TBuilder["entities"]]: ValidatedSchemaEntity<
        TBuilder["entities"][K],
        K
      >;
    }[keyof TBuilder["entities"]]
  >;
  root: ReadonlyArray<string>;
}

function ensureEntityIsRegistered<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId,
  builder: TBuilder,
): TBuilder["entities"][keyof TBuilder["entities"]] {
  const entityDefinition = getEntityDefinition(entity.type, builder);

  if (!entityDefinition) {
    throw new SchemaParsingError("The provided entity type is unknown.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId: entity.id, entityType: entity.type },
    });
  }

  return entityDefinition;
}

function ensureEntityTypeHasValidFormat(
  entity: ParsedSchemaEntityWithId,
): void {
  if (typeof entity.type !== "string" || entity.type.length === 0) {
    throw new SchemaParsingError("Entity type is missing.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId: entity.id },
    });
  }
}

function ensureEntityAttributesHaveValidFormat(
  entity: ParsedSchemaEntityWithId,
): void {
  if (
    typeof entity.attributes !== "object" ||
    Array.isArray(entity.attributes) ||
    entity.attributes === null
  ) {
    throw new SchemaParsingError(
      "The provided entity attributes are invalid.",
      {
        code: schemaParsingErrorCodes.MalformedSchema,
        payload: { entityId: entity.id, entityAttributes: entity.attributes },
      },
    );
  }
}

function ensureEntityHasAttributes(entity: ParsedSchemaEntityWithId): void {
  if (!entity.attributes) {
    throw new SchemaParsingError("Entity attributes are missing.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId: entity.id },
    });
  }
}

function ensureEntityAttributeIsRegistered(
  entity: ParsedSchemaEntityWithId,
  attributeName: PropertyKey,
  builder: Builder,
): Attribute {
  const entityDefinition = ensureEntityIsRegistered(entity, builder);

  if (!entityDefinition?.attributes[attributeName]) {
    throw new SchemaParsingError(
      "The provided entity attribute type is unknown",
      {
        code: schemaParsingErrorCodes.MalformedSchema,
        payload: { entityId: entity.id, attributeName: attributeName },
      },
    );
  }

  return entityDefinition.attributes[attributeName];
}

function ensureEntityAttributesAreRegistered(
  entity: ParsedSchemaEntityWithId,
  builder: Builder,
): void {
  Reflect.ownKeys(entity.attributes).forEach((attributeName) =>
    ensureEntityAttributeIsRegistered(entity, attributeName, builder),
  );
}

export async function validateEntityAttribute<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId<
    TBuilder["entities"][keyof TBuilder["entities"]]
  >,
  attributeName: PropertyKey,
  builder: TBuilder,
  schema: ParsedSchema<TBuilder>,
) {
  const entityDefinition = ensureEntityIsRegistered(entity, builder);

  const attributeDefinition = ensureEntityAttributeIsRegistered(
    entity,
    attributeName,
    builder,
  );

  const contextAttribute = {
    metadata: attributeDefinition.metadata,
    name: attributeName,
  };

  const attributeValue = entity.attributes[attributeName];

  const attributeRefinementContext: AttributeRefinementContext<
    typeof attributeDefinition,
    PropertyKey,
    typeof entityDefinition,
    keyof TBuilder["entities"],
    TBuilder["entities"]
  > = {
    schema,
    attribute: contextAttribute,
    entity: computeContextEntity(entity, undefined, builder),
  };

  const attributeRefiner = (value: unknown) =>
    attributeDefinition.validate[1](value, attributeRefinementContext);

  const attributeOverrideRefiner = entityDefinition.attributesOverrides[
    attributeName
  ]?.refine
    ? (value: unknown) =>
        entityDefinition.attributesOverrides[attributeName]?.refine
          ? entityDefinition.attributesOverrides[attributeName].refine(value, {
              ...attributeRefinementContext,
              refine: attributeRefiner,
            })
          : attributeRefiner(value)
    : undefined;

  const entityOverrideAttributeRefiner = builder.entitiesOverrides[
    entity.type
  ]?.attributes?.[attributeName]?.refine?.bind(
    builder.entitiesOverrides[entity.type]?.attributes?.[attributeName],
  );

  if (entityOverrideAttributeRefiner) {
    return entityOverrideAttributeRefiner(attributeValue, {
      ...attributeRefinementContext,
      refine: attributeOverrideRefiner ?? attributeRefiner,
    });
  } else if (attributeOverrideRefiner) {
    return attributeOverrideRefiner(attributeValue);
  } else {
    return attributeRefiner(attributeValue);
  }
}

export async function validateEntityAttributes<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId<
    TBuilder["entities"][keyof TBuilder["entities"]]
  >,
  builder: TBuilder,
  schema: ParsedSchema<TBuilder>,
): Promise<
  Result<
    EntityAttributesValues<TBuilder["entities"][keyof TBuilder["entities"]]>,
    EntityAttributesRefinementErrors
  >
> {
  const entityDefinition = ensureEntityIsRegistered(entity, builder);

  const attributesErrors: EntityAttributesRefinementErrors = {};

  const newAttributes: Record<PropertyKey, unknown> = {
    ...entity.attributes,
  };

  for (const attributeName of Reflect.ownKeys(entityDefinition.attributes)) {
    const result = await validateEntityAttribute(
      entity,
      attributeName,
      builder,
      schema,
    );

    if (result.success) {
      newAttributes[attributeName] = result.data;
    } else {
      attributesErrors[attributeName] = result.error;
    }
  }

  if (Reflect.ownKeys(attributesErrors).length) {
    return {
      success: false,
      error: attributesErrors,
    };
  }

  return {
    success: true,
    data: newAttributes as EntityAttributesValues<
      TBuilder["entities"][keyof TBuilder["entities"]]
    >,
  };
}

export function parseEntityAttributes<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId,
  builder: TBuilder,
): Result<
  EntityAttributesValues<TBuilder["entities"][keyof TBuilder["entities"]]>,
  EntityAttributesRefinementErrors
> {
  const entityDefinition = ensureEntityIsRegistered(entity, builder);

  const attributesErrors: EntityAttributesRefinementErrors = {};

  const newAttributes = {
    ...entity.attributes,
  };

  for (const attributeName of Reflect.ownKeys(entityDefinition.attributes)) {
    const attributeDefinition = ensureEntityAttributeIsRegistered(
      entity,
      attributeName,
      builder,
    );

    const attributeParsingResult = attributeDefinition.validate[0](
      entity.attributes[attributeName],
      {
        attribute: {
          metadata: attributeDefinition.metadata,
          name: attributeName,
        },
      },
    );

    if (attributeParsingResult.success) {
      newAttributes[attributeName] = attributeParsingResult.data;
    } else {
      attributesErrors[attributeName] = attributeParsingResult.error;
    }
  }

  if (Reflect.ownKeys(attributesErrors).length) {
    return {
      success: false,
      error: attributesErrors,
    };
  }

  return {
    success: true,
    data: newAttributes as EntityAttributesValues<
      TBuilder["entities"][keyof TBuilder["entities"]]
    >,
  };
}

export function ensureEntityOptionalParentIdHasValidReference<
  TEntities extends Record<PropertyKey, Entity>,
>(
  entity: ParsedSchemaEntityWithId<TEntities[PropertyKey]>,
  entities: ParsedSchema<Builder<TEntities>>["entities"],
): ParsedSchemaEntityWithId<TEntities[PropertyKey]> | undefined {
  if (typeof entity.parentId === "undefined") {
    return;
  }

  const parentEntity = entities[entity.parentId];

  if (!parentEntity) {
    throw new SchemaParsingError(
      "The parent ID references a non-existent entity.",
      {
        code: schemaParsingErrorCodes.MalformedSchema,
        payload: { entityId: entity.id, entityParentId: entity.parentId },
      },
    );
  }

  return { ...parentEntity, id: entity.parentId };
}

function ensureEntityParentIdDoesntHaveSelfReference(
  entity: ParsedSchemaEntityWithId,
): void {
  if (entity.parentId === entity.id || entity.children?.includes(entity.id)) {
    throw new SchemaParsingError("Self entity reference.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId: entity.id },
    });
  }
}

function ensureEntityChildrenHaveValidFormat(
  entity: ParsedSchemaEntityWithId,
): void {
  if (
    typeof entity.children !== "undefined" &&
    !Array.isArray(entity.children)
  ) {
    throw new SchemaParsingError("The provided children are invalid.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId: entity.id },
    });
  }
}

export function ensureEntityChildAllowed(
  entity: ParsedSchemaEntityWithId,
  childEntity: ParsedSchemaEntityWithId,
  builder: Builder,
): void {
  if (!isEntityChildAllowed(entity.type, childEntity.type, builder)) {
    throw new SchemaParsingError("Child is not allowed.", {
      code: schemaParsingErrorCodes.ChildNotAllowed,
      payload: { entityId: entity.id, childId: childEntity.id },
    });
  }
}

function ensureEntityChildrenAreAllowed<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId,
  builder: TBuilder,
  entities: ParsedSchema<TBuilder>["entities"],
): void {
  if (!entity.children) {
    return;
  }

  entity.children.forEach((id) => {
    const childEntity = ensureEntityExists(id, entities);

    ensureEntityChildAllowed(entity, childEntity, builder);
  });
}

function ensureChildIdUnique(
  entity: ParsedSchemaEntityWithId,
  childId: string,
): void {
  if (!entity.children) {
    return;
  }

  if (entity.children.filter((id) => id === childId).length > 1) {
    throw new SchemaParsingError("Duplicate IDs detected in the children.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId: entity.id },
    });
  }
}

function ensureChildrenIdsAreValid<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId,
  builder: TBuilder,
  entities: ParsedSchema<TBuilder>["entities"],
): void {
  if (!entity.children) {
    return;
  }

  entity.children.forEach((childId) => {
    builder.validateEntityId(childId);

    ensureEntityExists(childId, entities);

    ensureChildIdUnique(entity, childId);
  });
}

function ensureEntityHasParentId(
  entity: ParsedSchemaEntityWithId,
  parentId: string,
): void {
  if (entity.parentId !== parentId) {
    throw new SchemaParsingError("Children relationship mismatch.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId: parentId, childId: entity.id },
    });
  }
}

function ensureEntityChildrenMatchParentIds<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId,
  entities: ParsedSchema<TBuilder>["entities"],
): void {
  if (!entity.children) {
    return;
  }

  entity.children.forEach((id) =>
    ensureEntityHasParentId(ensureEntityExists(id, entities), entity.id),
  );
}

function ensureEntityParentIdMatchesParentChildren<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId,
  entities: ParsedSchema<TBuilder>["entities"],
) {
  if (!entity.parentId) {
    return;
  }

  const parent = ensureEntityExists(entity.parentId, entities);

  if (!parent.children?.includes(entity.id)) {
    throw new SchemaParsingError("Parent relationship mismatch.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId: entity.id, parentId: entity.parentId },
    });
  }
}

function ensureEntityCanLackParent(
  entity: ParsedSchemaEntityWithId,
  builder: Builder,
): void {
  if (!entity.parentId && isEntityParentRequired(entity.type, builder)) {
    throw new SchemaParsingError("A parent is required.", {
      code: schemaParsingErrorCodes.ParentRequired,
      payload: { entityId: entity.id },
    });
  }
}

function ensureEntityParentAllowed<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId,
  builder: TBuilder,
  entities: ParsedSchema<TBuilder>["entities"],
): void {
  if (!entity.parentId) {
    return;
  }

  const parentEntity = ensureEntityExists(entity.parentId, entities);

  if (!isEntityParentAllowed(entity.type, parentEntity.type, builder)) {
    throw new SchemaParsingError("Parent is not allowed.", {
      code: schemaParsingErrorCodes.ParentNotAllowed,
      payload: { entityId: entity.id, parentId: entity.parentId },
    });
  }
}

function ensureEntityReachable(
  entity: ParsedSchemaEntityWithId,
  root: ParsedSchema["root"],
): void {
  if (!entity.parentId && !root.includes(entity.id)) {
    throw new SchemaParsingError(
      "The entity is not in the root and has no parent ID.",
      {
        code: schemaParsingErrorCodes.MalformedSchema,
        payload: { entityId: entity.id },
      },
    );
  }
}

function validateEntitySchema<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId<
    TBuilder["entities"][keyof TBuilder["entities"]]
  >,
  builder: TBuilder,
  schema: ParsedSchema<TBuilder>,
): ParsedSchemaEntity<
  TBuilder["entities"][keyof TBuilder["entities"]],
  keyof TBuilder["entities"]
> {
  builder.validateEntityId(entity.id);

  if (typeof entity.parentId !== "undefined") {
    builder.validateEntityId(entity.parentId);
  }

  ensureEntityTypeHasValidFormat(entity);

  ensureEntityIsRegistered(entity, builder);

  ensureEntityHasAttributes(entity);

  ensureEntityAttributesHaveValidFormat(entity);

  ensureEntityAttributesAreRegistered(entity, builder);

  ensureEntityOptionalParentIdHasValidReference(entity, schema.entities);

  ensureEntityParentIdDoesntHaveSelfReference(entity);

  ensureEntityChildrenHaveValidFormat(entity);

  ensureChildrenIdsAreValid(entity, builder, schema.entities);

  ensureEntityChildrenAreAllowed(entity, builder, schema.entities);

  ensureEntityChildrenMatchParentIds(entity, schema.entities);

  ensureEntityParentIdMatchesParentChildren(entity, schema.entities);

  ensureEntityCanLackParent(entity, builder);

  ensureEntityParentAllowed(entity, builder, schema.entities);

  ensureEntityReachable(entity, schema.root);

  return {
    type: entity.type as keyof TBuilder["entities"],
    attributes: entity.attributes,
    ...(entity.parentId ? { parentId: entity.parentId } : {}),
    ...(entity.children ? { children: entity.children } : {}),
  };
}

export function ensureEntityExists<
  TEntities extends Record<PropertyKey, Entity>,
>(
  entityId: string,
  entities: ParsedSchema<Builder<TEntities>>["entities"],
): ParsedSchemaEntityWithId<TEntities[PropertyKey], keyof TEntities> {
  const entity = entities[entityId];

  if (!entity) {
    throw new SchemaParsingError("A provided entity ID does not exist.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId },
    });
  }

  return { ...entity, id: entityId };
}

function ensureRootEntityIdUnique(
  entityId: string,
  root: ParsedSchema["root"],
): void {
  if (root.filter((id) => id === entityId).length > 1) {
    throw new SchemaParsingError("Duplicate IDs detected in the root.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId },
    });
  }
}

function ensureEntitiesHaveValidFormat<TBuilder extends Builder>(
  entities: ParsedSchema<TBuilder>["entities"],
): void {
  if (
    typeof entities !== "object" ||
    Array.isArray(entities) ||
    entities === null
  ) {
    throw new SchemaParsingError(
      "Entities should be an object containing valid entities.",
      {
        code: schemaParsingErrorCodes.MalformedSchema,
        payload: { entities },
      },
    );
  }
}

function ensureRootHasValidFormat(root: ParsedSchema["root"]): void {
  if (!Array.isArray(root)) {
    throw new SchemaParsingError("The root must be an array of strings.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { root },
    });
  }
}

function ensureRootNotEmptyWhenThereAreEntities<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
): void {
  if (schema.root.length === 0 && Object.keys(schema.entities).length > 0) {
    throw new SchemaParsingError(
      "The root must contain at least one entity ID when there are entities in the schema.",
      {
        code: schemaParsingErrorCodes.MalformedSchema,
      },
    );
  }
}

function validateEntitiesSchema<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): ParsedSchema<TBuilder>["entities"] {
  return Object.entries(schema.entities).reduce(
    (result, [key, entity]) => ({
      ...result,
      [key]: validateEntitySchema({ ...entity, id: key }, builder, schema),
    }),
    schema.entities,
  );
}

function ensureRootIdsAreValid<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): void {
  schema.root.forEach((entityId) => {
    builder.validateEntityId(entityId);

    ensureEntityExists(entityId, schema.entities);

    ensureRootEntityIdUnique(entityId, schema.root);
  });
}

function ensureRootEntityDoesntHaveParent<TBuilder extends Builder>(
  id: string,
  entities: ParsedSchema<TBuilder>["entities"],
): void {
  const entity = ensureEntityExists(id, entities);

  if (typeof entity.parentId !== "undefined") {
    throw new SchemaParsingError("Root entities can't have a parent.", {
      code: schemaParsingErrorCodes.MalformedSchema,
      payload: { entityId: id },
    });
  }
}

function ensureRootEntitiesDontHaveParents<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
): void {
  schema.root.forEach((id) =>
    ensureRootEntityDoesntHaveParent(id, schema.entities),
  );
}

export function getEmptySchema<
  TEntities extends Record<PropertyKey, Entity>,
>(): ParsedSchema<Builder<TEntities>> {
  return { entities: {}, root: [] };
}

type SchemaParsingResult<TEntities extends Record<PropertyKey, Entity>> =
  Result<ParsedSchema<Builder<TEntities>>, SchemaParsingError>;

type SchemaValidationResult<TBuilder extends Builder> = Result<
  ValidatedSchema<TBuilder>,
  SchemaParsingError | SchemaRefinementError<TBuilder>
>;

export function parseSchema<TBuilder extends Builder>(
  schema: unknown,
  builder: TBuilder,
): SchemaParsingResult<TBuilder["entities"]> {
  const castedSchema = schema as ParsedSchema<TBuilder>;

  if (typeof schema === "undefined") {
    return {
      success: false,
      error: new SchemaParsingError("Schema is undefined", {
        code: schemaParsingErrorCodes.MalformedSchema,
      }),
    };
  }

  try {
    ensureEntitiesHaveValidFormat(castedSchema.entities);

    ensureRootHasValidFormat(castedSchema.root);

    ensureRootNotEmptyWhenThereAreEntities(castedSchema);

    const validatedEntities = validateEntitiesSchema(castedSchema, builder);

    const computedSchema = {
      entities: validatedEntities,
      root: castedSchema.root,
    };

    ensureRootIdsAreValid(computedSchema, builder);

    ensureRootEntitiesDontHaveParents(computedSchema);

    const entitiesAttributesValidationResult = parseEntitiesAttributes(
      computedSchema,
      builder,
    );

    if (!entitiesAttributesValidationResult.success) {
      return entitiesAttributesValidationResult;
    }

    return { data: computedSchema, success: true };
  } catch (error) {
    if (error instanceof SchemaParsingError) {
      return {
        error: error,
        success: false,
      };
    }

    return {
      error: new SchemaParsingError("An unknown error occurred.", {
        code: schemaParsingErrorCodes.MalformedSchema,
        payload: error,
      }),
      success: false,
    };
  }
}

const _EntitiesAttributesErrorsBrand = Symbol("EntitiesAttributesErrors");

export type EntitiesAttributesRefinementErrors<
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> = Record<
  string,
  EntityAttributesRefinementErrors<TEntities[keyof TEntities]>
> & {
  [_EntitiesAttributesErrorsBrand]: unknown;
};

function parseEntitiesAttributes<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): SchemaParsingResult<TBuilder["entities"]> {
  const entitiesAttributesErrors = {} as EntitiesAttributesRefinementErrors;

  const newEntities = { ...schema.entities };

  for (const [id, entity] of Object.entries(schema.entities)) {
    const newAttributes = parseEntityAttributes({ ...entity, id }, builder);

    if (!newAttributes.success) {
      entitiesAttributesErrors[id] = newAttributes.error;

      continue;
    }

    const newEntity = ensureEntityExists(id, newEntities);

    newEntity.attributes = newAttributes as typeof entity.attributes;
  }

  if (Reflect.ownKeys(entitiesAttributesErrors).length) {
    return {
      success: false,
      error: new SchemaParsingError(
        "Parsing has failed for some entities attributes.",
        {
          code: schemaParsingErrorCodes.AttributesParsingFailed,
          payload: { entitiesAttributesErrors },
        },
      ),
    };
  }

  return {
    success: true,
    data: { root: schema.root, entities: newEntities },
  };
}

async function validateEntitiesAttributes<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): Promise<SchemaValidationResult<TBuilder>> {
  const entitiesAttributesErrors = {} as EntitiesAttributesRefinementErrors;

  const newEntities = { ...schema.entities };

  for (const [id, entity] of Object.entries(schema.entities)) {
    const newAttributes = await validateEntityAttributes(
      { ...entity, id },
      builder,
      schema,
    );

    if (!newAttributes.success) {
      entitiesAttributesErrors[id] = newAttributes.error;

      continue;
    }

    const newEntity = ensureEntityExists(id, newEntities);

    newEntity.attributes = newAttributes.data;
  }

  if (Reflect.ownKeys(entitiesAttributesErrors).length) {
    return {
      success: false,
      error: new SchemaRefinementError(
        "Refining has failed for some entities attributes.",
        {
          code: schemaRefinementErrorCodes.AttributesRefinementFailed,
          payload: {
            entitiesAttributesErrors:
              entitiesAttributesErrors as EntitiesAttributesRefinementErrors<
                TBuilder["entities"]
              >,
          },
        },
      ),
    };
  }

  return {
    success: true,
    data: {
      root: schema.root,
      entities: newEntities as ValidatedSchema<TBuilder>["entities"],
    },
  };
}

export async function validateSchema<TBuilder extends Builder>(
  schema: unknown,
  builder: TBuilder,
): Promise<SchemaValidationResult<TBuilder>> {
  const schemaParsingResult = parseSchema(schema, builder);

  if (!schemaParsingResult.success) {
    return schemaParsingResult;
  }

  const entitiesAttributesValidationResult = await validateEntitiesAttributes(
    schemaParsingResult.data,
    builder,
  );

  if (!entitiesAttributesValidationResult.success) {
    return entitiesAttributesValidationResult;
  }

  const schemaRefinementResult = await builder.refineSchema(
    entitiesAttributesValidationResult.data,
  );

  if (!schemaRefinementResult.success) {
    return {
      success: false,
      error: new SchemaRefinementError("Schema refinement has failed.", {
        code: schemaRefinementErrorCodes.SchemaRefinementFailed,
        payload: { schemaError: schemaRefinementResult.error },
      }),
    };
  }

  return {
    success: true,
    data: schemaRefinementResult.data as ValidatedSchema<TBuilder>,
  };
}
