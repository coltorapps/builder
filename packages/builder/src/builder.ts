import {
  type AttributeDefinitionOverrideInput,
  type EntityDefinition,
  type InferEntityDefinitionParsedValue,
  type EntityDefinitionRefineContext,
  type InferEntityDefinitionRefineResult,
} from "./entity-definition";
import { type ValidatedSchema } from "./schema-validation";
import { type KeyofStringIntersection, type RefineResult } from "./utils";
import { generateUuid, validateUuid } from "./uuid";

interface BaseEntityDefinitionOverride {
  parentRequired?: boolean;
}

interface EntityDefinitionRefineOverrideContext<
  TEntity extends EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> extends EntityDefinitionRefineContext<TEntity, TType, TBuilder> {
  refine(value: InferEntityDefinitionParsedValue<TEntity>): InferEntityDefinitionRefineResult<TEntity>;
}

interface EntityDefinitionDefaultValueOverrideContext<
  TEntity extends EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> extends EntityDefinitionRefineContext<TEntity, TType, TBuilder> {
  defaultValue(): InferEntityDefinitionParsedValue<TEntity>;
}

interface EntityDefinitionShouldBeProcessedOverrideContext<
  TEntity extends EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> extends EntityDefinitionRefineContext<TEntity, TType, TBuilder> {
  shouldBeProcessed(): ReturnType<TEntity["shouldBeProcessed"]>;
}

export interface EntityDefinitionOverride<TEntity extends EntityDefinition = EntityDefinition>
  extends BaseEntityDefinitionOverride {
  childrenAllowed?: boolean | ReadonlyArray<string>;
  parentAllowed?: boolean | ReadonlyArray<string>;
  attributes?: Record<string, AttributeDefinitionOverrideInput>;
  refine?(
    value: InferEntityDefinitionParsedValue<TEntity>,
    context: EntityDefinitionRefineOverrideContext<TEntity>,
  ): InferEntityDefinitionRefineResult<TEntity>;
  defaultValue(context: EntityDefinitionDefaultValueOverrideContext<TEntity>): unknown;
  shouldBeProcessed(
    context: EntityDefinitionShouldBeProcessedOverrideContext<TEntity>,
  ): boolean;
}

interface EntityDefinitionOverrideInput<
  TBuilder extends Builder,
  TEntity extends EntityDefinition,
  TType extends string,
> extends BaseEntityDefinitionOverride {
  childrenAllowed?:
    | boolean
    | ReadonlyArray<KeyofStringIntersection<TBuilder["entities"]>>;
  parentAllowed?:
    | boolean
    | ReadonlyArray<KeyofStringIntersection<TBuilder["entities"]>>;
  refine?: (
    value: InferEntityDefinitionParsedValue<TEntity>,
    context: EntityDefinitionRefineOverrideContext<TEntity, TType, TBuilder>,
  ) => InferEntityDefinitionRefineResult<TEntity>;
  defaultValue?: (
    context: EntityDefinitionDefaultValueOverrideContext<TEntity, TType, TBuilder>,
  ) => InferEntityDefinitionParsedValue<TEntity>;
  shouldBeProcessed?(
    context: EntityDefinitionShouldBeProcessedOverrideContext<TEntity, TType, TBuilder>,
  ): boolean;
  attributes?: {
    [K in KeyofStringIntersection<
      TEntity["attributes"]
    >]?: AttributeDefinitionOverrideInput<
      TEntity["attributes"][K],
      K,
      TEntity,
      TType,
      TBuilder
    >;
  };
}

export type InferBuilderSchemaRefineResult<TBuilder extends Builder> =
  ReturnType<TBuilder["refineSchema"]>;

export type InferBuilderSchemaRefineError<TBuilder extends Builder> = Extract<
  InferBuilderSchemaRefineResult<TBuilder>,
  { success: false }
>["error"];

export interface Builder<
  TEntities extends Record<string, EntityDefinition> = Record<string, EntityDefinition>,
  TError = unknown,
> {
  entities: TEntities;
  generateEntityId(): string;
  validateEntityId(id: string): boolean;
  refineSchema(
    schema: ValidatedSchema<Builder<TEntities>>,
  ): RefineResult<ValidatedSchema<Builder<TEntities>>, TError>;
  entityOverrides: Record<string, EntityDefinitionOverride>;
}

export function createBuilder<
  const TEntities extends Record<string, EntityDefinition>,
  TRefineError = never,
>(options: {
  entities: TEntities;
  refineSchema?: Builder<TEntities, TRefineError>["refineSchema"];
  generateEntityId?: Builder["generateEntityId"];
  validateEntityId?: Builder["validateEntityId"];
  entityOverrides?: {
    [K in KeyofStringIntersection<TEntities>]?: EntityDefinitionOverrideInput<
      Builder<TEntities>,
      TEntities[K],
      K
    >;
  };
}): Builder<TEntities, TRefineError> {
  function fallbackRefineSchema(
    data: ValidatedSchema<Builder<TEntities>>,
  ): RefineResult<ValidatedSchema<Builder<TEntities>>, TRefineError> {
    return { success: true, value: data };
  }

  return {
    ...options,
    refineSchema: options.refineSchema ?? fallbackRefineSchema,
    generateEntityId: options.generateEntityId ?? generateUuid,
    validateEntityId: options.validateEntityId ?? validateUuid,
    entityOverrides:
      (options.entityOverrides as Builder["entityOverrides"]) ?? {},
  };
}
