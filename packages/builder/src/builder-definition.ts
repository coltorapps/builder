import type * as entityDefinition from "./entity-definition";
import type * as schemaParsing from "./schema-parsing";
import type * as utils from "./utils";
import * as uuid from "./uuid";

interface BaseEntityDefinitionOverride {
  parentRequired?: boolean;
}

interface EntityDefinitionRefineOverrideContext<
  TEntity extends entityDefinition.EntityDefinition,
  TType extends string = string,
  TBuilder extends BuilderDefinition = BuilderDefinition,
> extends entityDefinition.EntityDefinitionRefineContext<
    TEntity,
    TType,
    TBuilder
  > {
  refine(
    value: entityDefinition.InferEntityDefinitionParsedValue<TEntity>,
  ): entityDefinition.InferEntityDefinitionRefineResult<TEntity>;
}

interface EntityDefinitionDefaultValueOverrideContext<
  TEntity extends entityDefinition.EntityDefinition,
  TType extends string = string,
  TBuilder extends BuilderDefinition = BuilderDefinition,
> extends entityDefinition.EntityDefinitionRefineContext<
    TEntity,
    TType,
    TBuilder
  > {
  defaultValue(): entityDefinition.InferEntityDefinitionParsedValue<TEntity>;
}

interface EntityDefinitionShouldBeProcessedOverrideContext<
  TEntity extends entityDefinition.EntityDefinition,
  TType extends string = string,
  TBuilder extends BuilderDefinition = BuilderDefinition,
> extends entityDefinition.EntityDefinitionRefineContext<
    TEntity,
    TType,
    TBuilder
  > {
  shouldBeProcessed(): ReturnType<TEntity["shouldBeProcessed"]>;
}

export interface EntityDefinitionOverride<
  TEntity extends
    entityDefinition.EntityDefinition = entityDefinition.EntityDefinition,
> extends BaseEntityDefinitionOverride {
  childrenAllowed?: boolean | ReadonlyArray<string>;
  parentAllowed?: boolean | ReadonlyArray<string>;
  attributes?: Record<
    string,
    entityDefinition.AttributeDefinitionOverrideInput
  >;
  refine?(
    value: entityDefinition.InferEntityDefinitionParsedValue<TEntity>,
    context: EntityDefinitionRefineOverrideContext<TEntity>,
  ): entityDefinition.InferEntityDefinitionRefineResult<TEntity>;
  defaultValue(
    context: EntityDefinitionDefaultValueOverrideContext<TEntity>,
  ): unknown;
  shouldBeProcessed(
    context: EntityDefinitionShouldBeProcessedOverrideContext<TEntity>,
  ): boolean;
}

interface EntityDefinitionOverrideInput<
  TBuilder extends BuilderDefinition,
  TEntity extends entityDefinition.EntityDefinition,
  TType extends string,
> extends BaseEntityDefinitionOverride {
  childrenAllowed?:
    | boolean
    | ReadonlyArray<utils.KeyofStringIntersection<TBuilder["entities"]>>;
  parentAllowed?:
    | boolean
    | ReadonlyArray<utils.KeyofStringIntersection<TBuilder["entities"]>>;
  refine?: (
    value: entityDefinition.InferEntityDefinitionParsedValue<TEntity>,
    context: EntityDefinitionRefineOverrideContext<TEntity, TType, TBuilder>,
  ) => entityDefinition.InferEntityDefinitionRefineResult<TEntity>;
  defaultValue?: (
    context: EntityDefinitionDefaultValueOverrideContext<
      TEntity,
      TType,
      TBuilder
    >,
  ) => entityDefinition.InferEntityDefinitionParsedValue<TEntity>;
  shouldBeProcessed?(
    context: EntityDefinitionShouldBeProcessedOverrideContext<
      TEntity,
      TType,
      TBuilder
    >,
  ): boolean;
  attributes?: {
    [K in utils.KeyofStringIntersection<
      TEntity["attributes"]
    >]?: entityDefinition.AttributeDefinitionOverrideInput<
      TEntity["attributes"][K],
      K,
      TEntity,
      TType,
      TBuilder
    >;
  };
}

export type InferBuilderDefinitionSchemaRefineError<
  TBuilder extends BuilderDefinition,
> = Extract<ReturnType<TBuilder["refineSchema"]>, { success: false }>["error"];

export interface BuilderDefinition<
  TEntities extends Record<string, entityDefinition.EntityDefinition> = Record<
    string,
    entityDefinition.EntityDefinition
  >,
  TError = unknown,
> {
  entities: TEntities;
  generateEntityId(): string;
  validateEntityId(id: string): boolean;
  refineSchema(
    schema: schemaParsing.ParsedSchema<BuilderDefinition<TEntities>>,
  ): utils.RefineResult<
    schemaParsing.ParsedSchema<BuilderDefinition<TEntities>>,
    TError
  >;
  entityOverrides: Record<string, EntityDefinitionOverride>;
}

export function createBuilderDefinition<
  const TEntities extends Record<string, entityDefinition.EntityDefinition>,
  TRefineError = never,
>(options: {
  entities: TEntities;
  refineSchema?: BuilderDefinition<TEntities, TRefineError>["refineSchema"];
  generateEntityId?: BuilderDefinition["generateEntityId"];
  validateEntityId?: BuilderDefinition["validateEntityId"];
  entityOverrides?: {
    [K in utils.KeyofStringIntersection<TEntities>]?: EntityDefinitionOverrideInput<
      BuilderDefinition<TEntities>,
      TEntities[K],
      K
    >;
  };
}): BuilderDefinition<TEntities, TRefineError> {
  function fallbackRefineSchema(
    data: schemaParsing.ParsedSchema<BuilderDefinition<TEntities>>,
  ): utils.RefineResult<
    schemaParsing.ParsedSchema<BuilderDefinition<TEntities>>,
    TRefineError
  > {
    return { success: true, value: data };
  }

  return {
    ...options,
    refineSchema: options.refineSchema ?? fallbackRefineSchema,
    generateEntityId: options.generateEntityId ?? uuid.generateUuid,
    validateEntityId: options.validateEntityId ?? uuid.validateUuid,
    entityOverrides:
      (options.entityOverrides as BuilderDefinition["entityOverrides"]) ?? {},
  };
}
