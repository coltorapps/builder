import { pipe } from "effect/Function";
import * as O from "effect/Option";
import * as R from "effect/Record";

import {
  AttributeDefinitionOverride,
  AttributeDefinitionOverrideInput,
  EntityDefinition,
  EntityDefinitionRefineContext,
  InferEntityDefinitionParsedValue,
  InferEntityDefinitionRefineResult,
  normalizeAttributeOverrides,
} from "./entity-definition";
import { ParsedSchema } from "./schema-parsing";
import { KeyofStringIntersection, RefineResult } from "./utils";
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
    context: EntityDefinitionDefaultValueOverrideContext<
      TEntity,
      TType,
      TBuilder
    >,
  ) => InferEntityDefinitionParsedValue<TEntity>;
  shouldBeProcessed?(
    context: EntityDefinitionShouldBeProcessedOverrideContext<
      TEntity,
      TType,
      TBuilder
    >,
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
    data: ParsedSchema<Builder<TEntities>>,
  ): RefineResult<ParsedSchema<Builder<TEntities>>, TRefineError> {
    return { success: true, value: data };
  }

  return {
    ...options,
    refineSchema: options.refineSchema ?? fallbackRefineSchema,
    generateEntityId: options.generateEntityId ?? generateUuid,
    validateEntityId: options.validateEntityId ?? validateUuid,
    entityOverrides: normalizeEntityOverrides(
      options.entityOverrides ?? {},
    ) as Builder["entityOverrides"],
  };
}

export function getEntityDefinitionDangerously(
  entityType: string,
  builder: Builder,
): EntityDefinition {
  return pipe(
    R.get(builder.entities, entityType),
    O.getOrThrowWith(
      () =>
        new Error(
          `Entity type "${entityType}" not found in the builder. This is likely a bug.`,
        ),
    ),
  );
}
