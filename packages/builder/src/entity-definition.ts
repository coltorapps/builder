import { pipe } from "effect/Function";
import * as O from "effect/Option";
import * as R from "effect/Record";

import {
  type AttributeDefinition,
  type AttributeDefinitionRefineContext,
  type InferAttributeDefinitionParsedValue,
  type InferAttributeDefinitionRefineError,
  type InferAttributeDefinitionRefineResult,
} from "./attribute-definition";
import { type Builder } from "./builder";
import { type DraftSchema } from "./schema-parsing";
import {
  normalizeResult,
  type KeyofStringIntersection,
  type ParseFunction,
  type RefineFunction,
  type RefineResult,
  type Result,
  type UnnormalizedParseFunction,
  type UnnormalizedRefineFunction,
  type UnnormalizedRefineResult,
  type UnnormalizedResult,
} from "./utils";

interface ContextEntityInstance<
  TEntity extends EntityDefinition = EntityDefinition,
  TType extends string = string,
> {
  readonly id: string;
  readonly type: TType;
  readonly attributes: {
    [K in KeyofStringIntersection<TEntity["attributes"]>]: {
      readonly metadata: TEntity["attributes"][K]["metadata"];
      readonly name: K;
      readonly value: InferAttributeDefinitionParsedValue<
        TEntity["attributes"][K]
      >;
    };
  };
  readonly parentId: string | undefined;
  readonly children: ReadonlyArray<string> | undefined;
  readonly metadata: TEntity["metadata"];
}

export interface ContextEntityInstanceWithValue<
  TEntity extends EntityDefinition = EntityDefinition,
  TType extends string = string,
> extends ContextEntityInstance<TEntity, TType> {
  readonly value: InferEntityDefinitionParsedValue<TEntity> | undefined;
}

interface EntityDefinitionParseContext<
  TEntity extends EntityDefinition = EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> {
  readonly entity: ContextEntityInstance<TEntity, TType>;
  readonly schema: DraftSchema<TBuilder>;
}

export interface EntityDefinitionRefineContext<
  TEntity extends EntityDefinition = EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> {
  readonly entity: ContextEntityInstance<TEntity, TType>;
  readonly schema: DraftSchema<TBuilder>;
  readonly entities: Record<
    string,
    {
      [K in KeyofStringIntersection<
        TBuilder["entities"]
      >]: ContextEntityInstanceWithValue<TBuilder["entities"][K], K>;
    }[KeyofStringIntersection<TBuilder["entities"]>]
  >;
}

type EntityDefinitionDefaultValueContext<
  TEntity extends EntityDefinition = EntityDefinition,
> = EntityDefinitionRefineContext<TEntity>;

type EntityDefinitionShouldBeProcessedContext<
  TEntity extends EntityDefinition = EntityDefinition,
> = EntityDefinitionRefineContext<TEntity>;

interface AttributeDefinitionRefineOverrideContext<
  TAttribute extends AttributeDefinition = AttributeDefinition,
  TAttributeName extends string = string,
  TEntity extends EntityDefinition = EntityDefinition,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> extends AttributeDefinitionRefineContext<
    TAttribute,
    TAttributeName,
    TEntity,
    TEntityType,
    TBuilder
  > {
  readonly refine: (
    value: InferAttributeDefinitionParsedValue<TAttribute>,
  ) => InferAttributeDefinitionRefineResult<TAttribute>;
}

export interface AttributeDefinitionOverride<
  TAttribute extends AttributeDefinition = AttributeDefinition,
  TAttributeName extends string = string,
  TEntity extends EntityDefinition = EntityDefinition,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  readonly refine?: (
    value: InferAttributeDefinitionParsedValue<TAttribute>,
    context: AttributeDefinitionRefineOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TBuilder
    >,
  ) => InferAttributeDefinitionRefineResult<TAttribute>;
}

export interface AttributeDefinitionOverrideInput<
  TAttribute extends AttributeDefinition = AttributeDefinition,
  TAttributeName extends string = string,
  TEntity extends EntityDefinition = EntityDefinition,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  readonly refine?: (
    value: InferAttributeDefinitionParsedValue<TAttribute>,
    context: AttributeDefinitionRefineOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TBuilder
    >,
  ) => UnnormalizedRefineResult<
    InferAttributeDefinitionParsedValue<TAttribute>,
    InferAttributeDefinitionRefineError<TAttribute>
  >;
}

export interface EntityDefinition<
  TAttributes extends Record<string, AttributeDefinition> = Record<
    string,
    AttributeDefinition
  >,
  TValue = unknown,
  TParseError = unknown,
  TRefineError = unknown,
  TMetadata = unknown,
> {
  readonly attributes: TAttributes;
  readonly valueAllowed: boolean;
  readonly childrenAllowed: boolean;
  readonly parentAllowed: boolean;
  readonly parentRequired: boolean;
  readonly attributeOverrides: Record<string, AttributeDefinitionOverride>;
  readonly parse: ParseFunction<
    Result<TValue, TParseError>,
    EntityDefinitionParseContext
  >;
  readonly refine: RefineFunction<
    unknown,
    RefineResult<TValue, TRefineError>,
    EntityDefinitionRefineContext
  >;
  readonly defaultValue?: (
    context: EntityDefinitionDefaultValueContext<
      EntityDefinition<TAttributes, unknown, unknown, unknown, TMetadata>
    >,
  ) => unknown;
  readonly shouldBeProcessed: (
    context: EntityDefinitionShouldBeProcessedContext<
      EntityDefinition<TAttributes, unknown, unknown, unknown, TMetadata>
    >,
  ) => boolean;
  readonly metadata: TMetadata;
}

export type InferEntityDefinitionParseResult<TEntity extends EntityDefinition> =
  ReturnType<TEntity["parse"]>;

export type InferEntityDefinitionParseError<TEntity extends EntityDefinition> =
  Extract<
    InferEntityDefinitionParseResult<TEntity>,
    { success: false }
  >["error"];

export type InferEntityDefinitionParsedValue<TEntity extends EntityDefinition> =
  Extract<
    InferEntityDefinitionParseResult<TEntity>,
    { success: true }
  >["value"];

export type InferEntityDefinitionRefineResult<
  TEntity extends EntityDefinition,
> = ReturnType<TEntity["refine"]>;

export type InferEntityDefinitionRefineError<TEntity extends EntityDefinition> =
  Extract<
    InferEntityDefinitionRefineResult<TEntity>,
    { success: false }
  >["error"];

export type InferEntityDefinitionError<TEntity extends EntityDefinition> =
  | InferEntityDefinitionParseError<TEntity>
  | InferEntityDefinitionRefineError<TEntity>;

type CreateEntityDefinitionOptions<
  TAttributes extends Record<string, AttributeDefinition>,
  TMetadata,
> = {
  readonly attributeOverrides?: {
    [K in KeyofStringIntersection<TAttributes>]?: AttributeDefinitionOverrideInput<
      TAttributes[K],
      K,
      EntityDefinition<
        TAttributes,
        unknown,
        unknown,
        unknown,
        NoInfer<TMetadata>
      >
    >;
  };
  readonly attributes?: TAttributes;
  readonly childrenAllowed?: boolean;
  readonly parentAllowed?: boolean;
  readonly parentRequired?: boolean;
  readonly shouldBeProcessed?: (
    context: EntityDefinitionRefineContext<
      EntityDefinition<
        TAttributes,
        unknown,
        unknown,
        unknown,
        NoInfer<TMetadata>
      >
    >,
  ) => boolean;
  readonly metadata?: TMetadata;
};

type CreateEntityDefinitionSecondOptions<
  TValue,
  TRefineError,
  TAttributes extends Record<string, AttributeDefinition>,
  TMetadata,
> = {
  readonly refine?: UnnormalizedRefineFunction<
    TValue,
    UnnormalizedRefineResult<TValue, TRefineError>,
    EntityDefinitionRefineContext<
      EntityDefinition<
        TAttributes,
        unknown,
        unknown,
        unknown,
        NoInfer<TMetadata>
      >
    >
  >;
};

export function normalizeAttributeOverrides<
  TAttributeOverrides extends Record<string, AttributeDefinitionOverrideInput>,
>(
  attributeOverrides: TAttributeOverrides,
): Record<string, AttributeDefinitionOverride> {
  return R.map(attributeOverrides, (override) =>
    pipe(
      O.fromNullable(override.refine),
      O.map(
        (refine) =>
          ({
            ...override,
            refine: async (...args: Parameters<typeof refine>) =>
              normalizeResult(await refine(...args)),
          }) satisfies AttributeDefinitionOverride,
      ),
      O.getOrElse(() => override as AttributeDefinitionOverride),
    ),
  );
}

export function createEntityDefinition<
  const TAttributes extends Record<string, AttributeDefinition> = never,
  TValue = never,
  TParseError = never,
  TRefineError = never,
  TMetadata = never,
>(
  options?: CreateEntityDefinitionOptions<TAttributes, TMetadata> & {
    readonly parse?: UnnormalizedParseFunction<
      UnnormalizedResult<TValue, TParseError>,
      EntityDefinitionParseContext<
        EntityDefinition<
          TAttributes,
          unknown,
          unknown,
          unknown,
          NoInfer<TMetadata>
        >
      >
    >;
    readonly defaultValue?: (
      context: EntityDefinitionDefaultValueContext<
        EntityDefinition<TAttributes, unknown, unknown, unknown, TMetadata>
      >,
    ) => TValue;
  },
  secondOptions?: CreateEntityDefinitionSecondOptions<
    TValue,
    TRefineError,
    TAttributes,
    TMetadata
  >,
): EntityDefinition<
  NoInfer<TAttributes>,
  NoInfer<TValue>,
  NoInfer<TParseError>,
  NoInfer<TRefineError>,
  NoInfer<TMetadata>
> {
  function forbiddenValueHandler() {
    throw new Error("Value not allowed");
  }

  const parse = ((...args) =>
    options?.parse
      ? normalizeResult(
          options?.parse(...(args as Parameters<typeof options.parse>)),
        )
      : forbiddenValueHandler()) as EntityDefinition<
    TAttributes,
    TValue,
    TParseError,
    TRefineError,
    TMetadata
  >["parse"];

  const refine = pipe(
    O.fromNullable(options?.parse),
    O.map(() =>
      pipe(
        O.fromNullable(secondOptions?.refine),
        O.map(
          (refine) => async (...args: Parameters<typeof refine>) =>
            normalizeResult(await refine(...args)),
        ),
        O.getOrElse(() => (value: TValue) => ({ success: true, value })),
      ),
    ),
    O.getOrElse(() => forbiddenValueHandler),
  ) as EntityDefinition<
    TAttributes,
    TValue,
    TParseError,
    TRefineError
  >["refine"];

  return {
    ...options,
    metadata: options?.metadata as TMetadata,
    childrenAllowed: options?.childrenAllowed ?? false,
    parentRequired: options?.parentRequired ?? false,
    parentAllowed: options?.parentAllowed ?? true,
    attributes: options?.attributes ?? ({} as TAttributes),
    valueAllowed: Boolean(options?.parse),
    attributeOverrides: normalizeAttributeOverrides(
      options?.attributeOverrides ?? {},
    ),
    parse,
    refine,
    shouldBeProcessed: options?.shouldBeProcessed ?? (() => true),
    ...(options?.defaultValue ? { defaultValue: options.defaultValue } : {}),
  };
}
