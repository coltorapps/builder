import type * as B from "effect/Brand";
import { pipe } from "effect/Function";
import * as O from "effect/Option";
import * as R from "effect/Record";

import {
  normalizeAttributeOverrides,
  type AttributeDefinitionOverride,
  type AttributeDefinitionOverrideInput,
  type EntityDefinition,
  type EntityDefinitionRefineContext,
  type InferEntityDefinitionParsedValue,
  type InferEntityDefinitionRefineResult,
} from "./entity-definition";
import { type ParsedSchema } from "./schema-parsing";
import { type KeyofStringIntersection, type RefineResult } from "./utils";
import { generateUuid, validateUuid } from "./uuid";

interface BaseEntityDefinitionOverride {
  readonly parentRequired?: boolean;
}

interface EntityDefinitionRefineOverrideContext<
  TEntity extends EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> extends EntityDefinitionRefineContext<TEntity, TType, TBuilder> {
  readonly refine: (
    value: InferEntityDefinitionParsedValue<TEntity>,
  ) => InferEntityDefinitionRefineResult<TEntity>;
}

interface EntityDefinitionDefaultValueOverrideContext<
  TEntity extends EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> extends EntityDefinitionRefineContext<TEntity, TType, TBuilder> {
  readonly defaultValue: () => InferEntityDefinitionParsedValue<TEntity>;
}

interface EntityDefinitionShouldBeProcessedOverrideContext<
  TEntity extends EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> extends EntityDefinitionRefineContext<TEntity, TType, TBuilder> {
  readonly shouldBeProcessed: () => ReturnType<TEntity["shouldBeProcessed"]>;
}

export interface EntityDefinitionOverride<
  TEntity extends EntityDefinition = EntityDefinition,
> extends BaseEntityDefinitionOverride {
  readonly childrenAllowed?: boolean | ReadonlyArray<string>;
  readonly parentAllowed?: boolean | ReadonlyArray<string>;
  readonly attributes?: Record<string, AttributeDefinitionOverride>;
  readonly refine?: (
    value: InferEntityDefinitionParsedValue<TEntity>,
    context: EntityDefinitionRefineOverrideContext<TEntity>,
  ) => InferEntityDefinitionRefineResult<TEntity>;
  readonly defaultValue?: (
    context: EntityDefinitionDefaultValueOverrideContext<TEntity>,
  ) => unknown;
  readonly shouldBeProcessed?: (
    context: EntityDefinitionShouldBeProcessedOverrideContext<TEntity>,
  ) => boolean;
}

interface EntityDefinitionOverrideInput<
  TBuilder extends Builder,
  TEntity extends EntityDefinition,
  TType extends string,
> extends BaseEntityDefinitionOverride {
  readonly childrenAllowed?:
    | boolean
    | ReadonlyArray<KeyofStringIntersection<TBuilder["entities"]>>;
  readonly parentAllowed?:
    | boolean
    | ReadonlyArray<KeyofStringIntersection<TBuilder["entities"]>>;
  readonly refine?: (
    value: InferEntityDefinitionParsedValue<TEntity>,
    context: EntityDefinitionRefineOverrideContext<TEntity, TType, TBuilder>,
  ) => InferEntityDefinitionRefineResult<TEntity>;
  readonly defaultValue?: (
    context: EntityDefinitionDefaultValueOverrideContext<
      TEntity,
      TType,
      TBuilder
    >,
  ) => InferEntityDefinitionParsedValue<TEntity>;
  readonly shouldBeProcessed?: (
    context: EntityDefinitionShouldBeProcessedOverrideContext<
      TEntity,
      TType,
      TBuilder
    >,
  ) => boolean;
  readonly attributes?: {
    readonly [K in KeyofStringIntersection<
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

export type InferBuilderSchemaRefineError<TBuilder extends Builder> = Extract<
  ReturnType<TBuilder["refineSchema"]>,
  { success: false }
>["error"];

export function normalizeEntityOverrides<
  TEntityOverrides extends Record<string, EntityDefinitionOverride>,
>(entityOverrides: TEntityOverrides): Record<string, EntityDefinitionOverride> {
  return R.map(entityOverrides, (override) => ({
    ...override,
    ...((override.attributes
      ? { attributes: normalizeAttributeOverrides(override.attributes) }
      : {}) satisfies EntityDefinitionOverride),
    ...(pipe(
      O.fromNullable(override.refine),
      O.map((refine) => ({
        refine: async (...args: Parameters<typeof refine>) =>
          await refine(...args),
      })),
      O.getOrElse(() => ({})),
    ) satisfies EntityDefinitionOverride),
    ...(pipe(
      O.fromNullable(override.defaultValue),
      O.map((defaultValue) => ({
        defaultValue: (...args: Parameters<typeof defaultValue>) =>
          defaultValue(...args),
      })),
      O.getOrElse(() => ({})),
    ) satisfies EntityDefinitionOverride),
    ...(pipe(
      O.fromNullable(override.shouldBeProcessed),
      O.map((shouldBeProcessed) => ({
        shouldBeProcessed: (...args: Parameters<typeof shouldBeProcessed>) =>
          shouldBeProcessed(...args),
      })),
      O.getOrElse(() => ({})),
    ) satisfies EntityDefinitionOverride),
  }));
}

export interface Builder<
  TEntities extends Record<string, EntityDefinition> = Record<
    string,
    EntityDefinition
  >,
  TError = unknown,
> {
  readonly entities: TEntities;
  readonly generateEntityId: () => string;
  readonly validateEntityId: (id: string) => boolean;
  readonly refineSchema: (
    schema: ParsedSchema<Builder<TEntities>>,
  ) => RefineResult<ParsedSchema<Builder<TEntities>>, TError>;
  readonly entityOverrides: Record<string, EntityDefinitionOverride>;
}

export function createBuilder<
  const TEntities extends Record<string, EntityDefinition>,
  TRefineError = never,
>(options: {
  readonly entities: TEntities;
  readonly refineSchema?: Builder<TEntities, TRefineError>["refineSchema"];
  readonly generateEntityId?: Builder["generateEntityId"];
  readonly validateEntityId?: Builder["validateEntityId"];
  readonly entityOverrides?: {
    readonly [K in KeyofStringIntersection<TEntities>]?: EntityDefinitionOverrideInput<
      Builder<TEntities>,
      TEntities[K],
      K
    >;
  };
}): Builder<TEntities, TRefineError> {
  function fallbackRefineSchema(
    data: ParsedSchema<Builder<TEntities>>,
  ): RefineResult<ParsedSchema<Builder<TEntities>>, TRefineError> {
    return { success: true, value: data };
  }

  return {
    ...options,
    refineSchema: options.refineSchema ?? fallbackRefineSchema,
    generateEntityId: options.generateEntityId ?? generateUuid,
    validateEntityId: options.validateEntityId ?? validateUuid,
    entityOverrides: normalizeEntityOverrides(options.entityOverrides ?? {}),
  };
}

export function getEntityDefinitionDangerously<TBuilder extends Builder>(
  entityType: KeyofStringIntersection<TBuilder["entities"]>,
  builder: TBuilder,
): TBuilder["entities"][KeyofStringIntersection<TBuilder["entities"]>] {
  return pipe(
    R.get(builder.entities, entityType),
    O.getOrThrowWith(
      () =>
        new Error(
          `Entity type "${entityType}" not found in the builder. This is likely a bug.`,
        ),
    ),
  ) as TBuilder["entities"][KeyofStringIntersection<TBuilder["entities"]>];
}

declare const builderBrand: unique symbol;

export type BuilderBrand<
  TBuilder extends Builder,
  TKey extends string | symbol,
> = {
  readonly [builderBrand]: {
    _b: TBuilder;
    _a: {
      [K in KeyofStringIntersection<TBuilder["entities"]>]: {
        [K2 in KeyofStringIntersection<
          TBuilder["entities"][K]["attributes"]
        >]: `${K}.${K2}`;
      }[KeyofStringIntersection<TBuilder["entities"][K]["attributes"]>];
    }[KeyofStringIntersection<TBuilder["entities"]>];
  };
} & B.Brand<TKey>;
