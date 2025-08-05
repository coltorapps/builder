import { type Attribute } from "./attribute";
import {
  type AttributeOverrideInput,
  type Entity,
  type EntityRefinementContext,
  type EntityRefinementResult,
  type EntityValue,
} from "./entity";
import {
  SchemaParsingError,
  schemaParsingErrorCodes,
  type ValidatedSchema,
} from "./schema";
import { Result, type PromisedRefinementResult } from "./utils";
import { generateUuid, validateUuid } from "./uuid";

interface BaseEntityOverride {
  parentRequired?: boolean;
}

interface EntityRefinementOverrideContext<
  TEntity extends Entity,
  TType extends PropertyKey = PropertyKey,
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> extends EntityRefinementContext<TEntity, TType, TEntities> {
  refine(value: EntityValue<TEntity>): EntityRefinementResult<TEntity>;
}

interface EntityDefaultValueOverrideContext<
  TEntity extends Entity,
  TType extends PropertyKey = PropertyKey,
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> extends EntityRefinementContext<TEntity, TType, TEntities> {
  defaultValue(): ReturnType<TEntity["defaultValue"]>;
}

interface EntityShouldBeProcessedOverrideContext<
  TEntity extends Entity,
  TType extends PropertyKey = PropertyKey,
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> extends EntityRefinementContext<TEntity, TType, TEntities> {
  shouldBeProcessed(): ReturnType<TEntity["shouldBeProcessed"]>;
}

export interface EntityOverride<TEntity extends Entity = Entity>
  extends BaseEntityOverride {
  childrenAllowed?: boolean | ReadonlyArray<PropertyKey>;
  allowedParents?: ReadonlyArray<PropertyKey>;
  attributes?: Record<PropertyKey, AttributeOverrideInput>;
  refine?(
    value: EntityValue<TEntity>,
    context: EntityRefinementOverrideContext<TEntity>,
  ): EntityRefinementResult<TEntity>;
  defaultValue(context: EntityDefaultValueOverrideContext<TEntity>): unknown;
  shouldBeProcessed(
    context: EntityShouldBeProcessedOverrideContext<TEntity>,
  ): boolean;
}

interface EntityOverrideInput<
  TEntities extends Record<PropertyKey, Entity>,
  TEntity extends Entity,
  TType extends PropertyKey,
> extends BaseEntityOverride {
  childrenAllowed?: boolean | ReadonlyArray<keyof TEntities>;
  allowedParents?: ReadonlyArray<keyof TEntities>;
  refine?: (
    value: EntityValue<TEntity>,
    context: EntityRefinementOverrideContext<TEntity, TType, TEntities>,
  ) => EntityRefinementResult<TEntity>;
  defaultValue?: (
    context: EntityDefaultValueOverrideContext<TEntity, TType, TEntities>,
  ) => EntityValue<TEntity>;
  shouldBeProcessed?(
    context: EntityShouldBeProcessedOverrideContext<TEntity, TType, TEntities>,
  ): boolean;
  attributes?: {
    [K in keyof TEntity["attributes"]]?: AttributeOverrideInput<
      TEntity["attributes"][K],
      K,
      TEntity,
      TType,
      TEntities
    >;
  };
}

export type BuilderSchemaRefinementResult<TBuilder extends Builder> =
  ReturnType<TBuilder["refineSchema"]>;

export type BuilderSchemaRefinementError<TBuilder extends Builder> = Extract<
  BuilderSchemaRefinementResult<TBuilder>,
  { success: false }
>["error"];

export interface Builder<
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
  TError = unknown,
> {
  entities: TEntities;
  generateEntityId(): string;
  validateEntityId(id: string): void;
  refineSchema(
    schema: ValidatedSchema<Builder<TEntities>>,
  ): PromisedRefinementResult<ValidatedSchema<Builder<TEntities>>, TError>;
  entitiesOverrides: Record<PropertyKey, EntityOverride>;
}

type OptionalBuilderArgs =
  | "refineSchema"
  | "generateEntityId"
  | "validateEntityId";

interface CreateBuilderOptions<
  TEntities extends Record<PropertyKey, Entity>,
  TError,
> extends Omit<
      Builder<TEntities, TError>,
      OptionalBuilderArgs | "entitiesOverrides"
    >,
    Partial<Pick<Builder<TEntities, TError>, OptionalBuilderArgs>> {
  entitiesOverrides?: {
    [K in keyof TEntities]?: EntityOverrideInput<TEntities, TEntities[K], K>;
  };
}

export function createBuilder<
  const TEntities extends Record<PropertyKey, Entity>,
  TError = never,
>(
  options: CreateBuilderOptions<TEntities, TError>,
): Builder<TEntities, TError> {
  function fallbackRefineSchema(
    schema: ValidatedSchema<Builder<TEntities>>,
  ): PromisedRefinementResult<ValidatedSchema<Builder<TEntities>>, TError> {
    return { success: true, data: schema };
  }

  return {
    ...options,
    refineSchema: options.refineSchema ?? fallbackRefineSchema,
    generateEntityId: options.generateEntityId ?? generateUuid,
    validateEntityId: options.validateEntityId ?? validateUuid,
    entitiesOverrides:
      (options.entitiesOverrides as Builder["entitiesOverrides"]) ?? {},
  };
}

export function getBuilderEntitiesTypes<TBuilder extends Builder>(
  builder: TBuilder,
): ReadonlyArray<keyof TBuilder["entities"]> {
  return Reflect.ownKeys(builder.entities);
}

export function getEntityDefinition<TBuilder extends Builder>(
  entityType: keyof TBuilder["entities"],
  builder: TBuilder,
): TBuilder["entities"][keyof TBuilder["entities"]] | undefined {
  return builder.entities[entityType];
}

export function ensureEntityIsRegistered<TBuilder extends Builder>(
  entityType: keyof TBuilder["entities"],
  builder: TBuilder,
): Result<
  TBuilder["entities"][keyof TBuilder["entities"]],
  SchemaParsingError,
  "entityDefinition"
> {
  const entityDefinition = getEntityDefinition(entityType, builder);

  if (!entityDefinition) {
    return {
      success: false,
      error: new SchemaParsingError(
        `Unkown entity type "${String(entityType)}".`,
        {
          code: schemaParsingErrorCodes.MalformedSchema,
          payload: { entityType },
        },
      ),
    };
  }

  return {
    success: true,
    entityDefinition,
  };
}

export function ensureEntityAttributeIsRegistered<TBuilder extends Builder>(
  entityType: PropertyKey,
  attributeName: PropertyKey,
  builder: TBuilder,
): Result<Attribute, SchemaParsingError, "attributeDefinition"> {
  const entityDefinitionResult = ensureEntityIsRegistered(entityType, builder);

  if (!entityDefinitionResult.success) {
    return entityDefinitionResult;
  }

  const attributeDefinition =
    entityDefinitionResult.entityDefinition.attributes[attributeName];

  if (!attributeDefinition) {
    return {
      success: false,
      error: new SchemaParsingError(
        `Entity of type "${String(entityType)}" does not have an attribute named "${String(attributeName)}".`,
        {
          code: schemaParsingErrorCodes.MalformedSchema,
          payload: { entityType, attributeName },
        },
      ),
    };
  }

  return {
    success: true,
    attributeDefinition,
  };
}

export function ensureEntityAttributesAreRegistered(
  entityType: PropertyKey,
  attributeNames: Array<PropertyKey>,
  builder: Builder,
): Result<Array<Attribute>, SchemaParsingError, "attributesDefinitions"> {
  const attributesResults = attributeNames.map((attributeName) =>
    ensureEntityAttributeIsRegistered(entityType, attributeName, builder),
  );

  const attributesErrors = attributesResults
    .filter((result) => !result.success)
    .map((result) => result.error);

  const attributesDefinitions = attributesResults
    .filter((result) => result.success)
    .map((result) => result.attributeDefinition);

  if (attributesErrors.length > 0) {
    return {
      success: false,
      error: new SchemaParsingError(
        `Entity of type "${String(entityType)}" does not have all attributes named "${String(attributeNames.join(", "))}.`,
        {
          code: schemaParsingErrorCodes.MalformedSchema,
          payload: {
            attributesErrors,
          },
        },
      ),
    };
  }

  return {
    success: true,
    attributesDefinitions,
  };
}

export function isEntityChildAllowed(
  entityType: PropertyKey,
  childEntityType: PropertyKey,
  builder: Builder,
): Result<boolean, SchemaParsingError, "isEntityChildAllowed"> {
  const entityDefinitionResult = ensureEntityIsRegistered(entityType, builder);

  if (!entityDefinitionResult.success) {
    return {
      success: false,
      error: entityDefinitionResult.error,
    };
  }

  const allowedChildren =
    builder.entitiesOverrides[entityType]?.childrenAllowed ??
    entityDefinitionResult.entityDefinition.childrenAllowed;

  if (!allowedChildren) {
    return {
      success: true,
      isEntityChildAllowed: false,
    };
  }

  return {
    success: true,
    isEntityChildAllowed:
      allowedChildren === true || allowedChildren.includes(childEntityType),
  };
}

export function isEntityParentAllowed(
  entityType: PropertyKey,
  parentEntityType: PropertyKey,
  builder: Builder,
): Result<boolean, SchemaParsingError, "parentAllowed"> {
  const entityDefinitionResult = ensureEntityIsRegistered(entityType, builder);

  if (!entityDefinitionResult.success) {
    return entityDefinitionResult;
  }

  const allowedParents = builder.entitiesOverrides[entityType]?.allowedParents;

  if (!allowedParents) {
    return {
      success: true,
      parentAllowed: true,
    };
  }

  const parentEntityDefinitionResult = ensureEntityIsRegistered(
    parentEntityType,
    builder,
  );

  if (!parentEntityDefinitionResult.success) {
    return parentEntityDefinitionResult;
  }

  return {
    success: true,
    parentAllowed: allowedParents.includes(parentEntityType),
  };
}

export function isEntityParentRequired(
  entityType: PropertyKey,
  builder: Builder,
): Result<boolean, SchemaParsingError, "parentRequired"> {
  const entityDefinitionResult = ensureEntityIsRegistered(entityType, builder);

  if (!entityDefinitionResult.success) {
    return entityDefinitionResult;
  }

  return {
    success: true,
    parentRequired:
      builder.entitiesOverrides[entityType]?.parentRequired ??
      entityDefinitionResult.entityDefinition.parentRequired,
  };
}

export function ensureEntityChildAllowed(
  entityType: PropertyKey,
  childEntityType: PropertyKey,
  builder: Builder,
): Result<boolean, SchemaParsingError, never> {
  const isEntityChildAllowedResult = isEntityChildAllowed(entityType, childEntityType, builder);

  if (!isEntityChildAllowedResult.success) {
    return isEntityChildAllowedResult;
  }

  if (!isEntityChildAllowedResult.isEntityChildAllowed) {
    return {
      success: false,
      error: new SchemaParsingError(
        `Entities of type "${String(childEntityType)}" are not allowed as children of entities of type "${String(entityType)}".`,
        {
          code: schemaParsingErrorCodes.MalformedSchema,
          payload: { entityType, childEntityType },
        },
      ),
    };
  }

  return {
    success: true,
  };
}

export function ensureEntityCanLackParent(
  entityType: PropertyKey,
  builder: Builder,
): Result<boolean, SchemaParsingError, never> {
  const entityDefinitionResult = ensureEntityIsRegistered(entityType, builder);

  if (!entityDefinitionResult.success) {
    return entityDefinitionResult;
  }

  const parentRequired =
    builder.entitiesOverrides[entityType]?.parentRequired ??
    entityDefinitionResult.entityDefinition.parentRequired;

  if (parentRequired) {
    return {
      success: false,
      error: new SchemaParsingError(
        `Entities of type "${String(entityType)}" require a parent.`,
        {
          code: schemaParsingErrorCodes.MalformedSchema,
          payload: { entityType },
        },
      ),
    };
  }

  return {
    success: true,
  };
}

export function ensureEntityParentAllowed(
  entityType: PropertyKey,
  parentEntityType: PropertyKey,
  builder: Builder,
): Result<boolean, SchemaParsingError, never> {
  const isEntityParentAllowedResult = isEntityParentAllowed(
    entityType,
    parentEntityType,
    builder,
  );

  if (!isEntityParentAllowedResult.success) {
    return isEntityParentAllowedResult;
  }

  if (!isEntityParentAllowedResult.parentAllowed) {
    return {
      success: false,
      error: new SchemaParsingError(
        `Entities of type "${String(entityType)}" cannot have a parent of type "${String(parentEntityType)}".`,
        {
          code: schemaParsingErrorCodes.MalformedSchema,
          payload: { entityType, parentEntityType },
        },
      ),
    };
  }

  return {
    success: true,
  };
}
