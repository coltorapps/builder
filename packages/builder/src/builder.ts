import {
  type AttributeOverrideInput,
  type Entity,
  type EntityParsedValue,
  type EntityRefineContext,
  type EntityRefineResult,
} from "./entity";
import { type ValidatedSchema } from "./schema-validation";
import { type RefineResult,  } from "./utils";
import { generateUuid, validateUuid } from "./uuid";

interface BaseEntityOverride {
  parentRequired?: boolean;
}

interface EntityRefineOverrideContext<
  TEntity extends Entity,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> extends EntityRefineContext<TEntity, TType, TBuilder> {
  refine(value: EntityParsedValue<TEntity>): EntityRefineResult<TEntity>;
}

interface EntityDefaultValueOverrideContext<
  TEntity extends Entity,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> extends EntityRefineContext<TEntity, TType, TBuilder> {
  defaultValue(): ReturnType<TEntity["defaultValue"]>;
}

interface EntityShouldBeProcessedOverrideContext<
  TEntity extends Entity,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> extends EntityRefineContext<TEntity, TType, TBuilder> {
  shouldBeProcessed(): ReturnType<TEntity["shouldBeProcessed"]>;
}

export interface EntityOverride<TEntity extends Entity = Entity>
  extends BaseEntityOverride {
  childrenAllowed?: boolean | ReadonlyArray<string>;
  parentAllowed?: boolean | ReadonlyArray<string>;
  attributes?: Record<string, AttributeOverrideInput>;
  refine?(
    value: EntityParsedValue<TEntity>,
    context: EntityRefineOverrideContext<TEntity>,
  ): EntityRefineResult<TEntity>;
  defaultValue(context: EntityDefaultValueOverrideContext<TEntity>): unknown;
  shouldBeProcessed(
    context: EntityShouldBeProcessedOverrideContext<TEntity>,
  ): boolean;
}

interface EntityOverrideInput<
  TBuilder extends Builder,
  TEntity extends Entity,
  TType extends string,
> extends BaseEntityOverride {
  childrenAllowed?:
    | boolean
    | ReadonlyArray<keyof TBuilder["entities"] & string>;
  parentAllowed?:
    | boolean
    | ReadonlyArray<keyof TBuilder["entities"] & string>;
  refine?: (
    value: EntityParsedValue<TEntity>,
    context: EntityRefineOverrideContext<TEntity, TType, TBuilder>,
  ) => EntityRefineResult<TEntity>;
  defaultValue?: (
    context: EntityDefaultValueOverrideContext<TEntity, TType, TBuilder>,
  ) => EntityParsedValue<TEntity>;
  shouldBeProcessed?(
    context: EntityShouldBeProcessedOverrideContext<TEntity, TType, TBuilder>,
  ): boolean;
  attributes?: {
    [K in keyof TEntity["attributes"] & string]?: AttributeOverrideInput<
      TEntity["attributes"][K],
      K,
      TEntity,
      TType,
      TBuilder
    >;
  };
}

export type BuilderSchemaRefineResult<TBuilder extends Builder> =
  ReturnType<TBuilder["refineSchema"]>;

export type BuilderSchemaRefineError<TBuilder extends Builder> = Extract<
  BuilderSchemaRefineResult<TBuilder>,
  { success: false }
>["error"];

export interface Builder<
  TEntities extends Record<string, Entity> = Record<string, Entity>,
  TError = unknown,
> {
  entities: TEntities;
  generateEntityId(): string;
  validateEntityId(id: string): boolean;
  refineSchema(
    schema: ValidatedSchema<Builder<TEntities>>,
  ): RefineResult<ValidatedSchema<Builder<TEntities>>, TError>;
  entityOverrides: Record<string, EntityOverride>;
}

export function createBuilder<
  const TEntities extends Record<string, Entity>,
  TRefineError = never,
>(options: {
  entities: TEntities;
  refineSchema?: Builder<TEntities, TRefineError>["refineSchema"];
  generateEntityId?: Builder["generateEntityId"];
  validateEntityId?: Builder["validateEntityId"];
  entityOverrides?: {
    [K in keyof TEntities & string]?: EntityOverrideInput<
      Builder<TEntities>,
      TEntities[K],
      K
    >;
  };
}): Builder<TEntities, TRefineError> {
  function fallbackRefineSchema(
    data: ValidatedSchema<Builder<TEntities>>,
  ): RefineResult<
    ValidatedSchema<Builder<TEntities>>,
    TRefineError
  > {
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
