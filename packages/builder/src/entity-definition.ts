import {
  type AttributeDefinition,
  type AttributeDefinitionRefineContext,
  type InferAttributeDefinitionParsedValue,
  type InferAttributeDefinitionRefineResult,
} from "./attribute-definition";
import { type Builder } from "./builder";
import { type DraftSchema } from "./schema-parsing";
import type {
  KeyofStringIntersection,
  ParseFunction,
  RefineFunction,
  RefineResult,
  Result,
} from "./utils";

export interface ContextEntityInstance<
  TEntity extends EntityDefinition = EntityDefinition,
  TType extends string = string,
> {
  id: string;
  type: TType;
  attributes: {
    [K in KeyofStringIntersection<TEntity["attributes"]>]: {
      metadata: TEntity["attributes"][K]["metadata"];
      name: K;
      value: InferAttributeDefinitionParsedValue<TEntity["attributes"][K]>;
    };
  };
  parentId?: string | undefined;
  children?: ReadonlyArray<string> | undefined;
  metadata: TEntity["metadata"];
}

export interface ContextEntityInstanceWithValue<
  TEntity extends EntityDefinition = EntityDefinition,
  TType extends string = string,
> extends ContextEntityInstance<TEntity, TType> {
  value?: InferEntityDefinitionParsedValue<TEntity>;
}

export interface EntityDefinitionParseContext<
  TEntity extends EntityDefinition = EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> {
  entity: ContextEntityInstance<TEntity, TType>;
  schema: DraftSchema<TBuilder>;
}

export interface EntityDefinitionRefineContext<
  TEntity extends EntityDefinition = EntityDefinition,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> {
  entity: ContextEntityInstance<TEntity, TType>;
  schema: DraftSchema<TBuilder>;
  entities: Record<
    string,
    {
      [K in KeyofStringIntersection<
        TBuilder["entities"]
      >]: ContextEntityInstanceWithValue<TBuilder["entities"][K], K>;
    }[KeyofStringIntersection<TBuilder["entities"]>]
  >;
}

export type EntityDefinitionDefaultValueContext<
  TEntity extends EntityDefinition = EntityDefinition,
> = EntityDefinitionRefineContext<TEntity>;

export type EntityDefinitionShouldBeProcessedContext<
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
  refine(
    value: InferAttributeDefinitionParsedValue<TAttribute>,
  ): InferAttributeDefinitionRefineResult<TAttribute>;
}

export interface AttributeDefinitionOverride<
  TAttribute extends AttributeDefinition = AttributeDefinition,
  TAttributeName extends string = string,
  TEntity extends EntityDefinition = EntityDefinition,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  refine?(
    value: InferAttributeDefinitionParsedValue<TAttribute>,
    context: AttributeDefinitionRefineOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TBuilder
    >,
  ): InferAttributeDefinitionRefineResult<TAttribute>;
}

export interface AttributeDefinitionOverrideInput<
  TAttribute extends AttributeDefinition = AttributeDefinition,
  TAttributeName extends string = string,
  TEntity extends EntityDefinition = EntityDefinition,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  refine?(
    value: InferAttributeDefinitionParsedValue<TAttribute>,
    context: AttributeDefinitionRefineOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TBuilder
    >,
  ): InferAttributeDefinitionRefineResult<TAttribute>;
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
  attributes: TAttributes;
  valueAllowed: boolean;
  childrenAllowed: boolean;
  parentAllowed: boolean;
  parentRequired: boolean;
  attributeOverrides: Record<string, AttributeDefinitionOverride>;
  parse: ParseFunction<
    Result<TValue, TParseError>,
    EntityDefinitionParseContext
  >;
  refine: RefineFunction<
    unknown,
    RefineResult<TValue, TRefineError>,
    EntityDefinitionRefineContext
  >;
  defaultValue?(
    context: EntityDefinitionDefaultValueContext<
      EntityDefinition<TAttributes, unknown, unknown, unknown, TMetadata>
    >,
  ): unknown;
  shouldBeProcessed(
    context: EntityDefinitionShouldBeProcessedContext<
      EntityDefinition<TAttributes, unknown, unknown, unknown, TMetadata>
    >,
  ): boolean;
  metadata: TMetadata;
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

type CreateEntityDefinitionOptions<
  TAttributes extends Record<string, AttributeDefinition>,
  TMetadata,
> = {
  attributeOverrides?: {
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
  attributes?: TAttributes;
  childrenAllowed?: boolean;
  parentAllowed?: boolean;
  parentRequired?: boolean;
  shouldBeProcessed?(
    context: EntityDefinitionRefineContext<
      EntityDefinition<
        TAttributes,
        unknown,
        unknown,
        unknown,
        NoInfer<TMetadata>
      >
    >,
  ): boolean;
  metadata?: TMetadata;
};

type CreateEntityDefinitionSecondOptions<
  TValue,
  TRefineError,
  TAttributes extends Record<string, AttributeDefinition>,
  TMetadata,
> = {
  refine?: RefineFunction<
    TValue,
    RefineResult<TValue, TRefineError>,
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

export function createEntityDefinition<
  const TAttributes extends Record<string, AttributeDefinition> = never,
  TMetadata = never,
>(
  options?: CreateEntityDefinitionOptions<TAttributes, TMetadata> & {
    parse?: never;
    defaultValue?: never;
  },
): EntityDefinition<
  NoInfer<TAttributes>,
  never,
  never,
  never,
  NoInfer<TMetadata>
>;

export function createEntityDefinition<
  const TAttributes extends Record<string, AttributeDefinition> = never,
  TValue = never,
  TParseError = never,
  TRefineError = never,
  TMetadata = never,
>(
  options: CreateEntityDefinitionOptions<TAttributes, TMetadata> & {
    parse: ParseFunction<
      Result<TValue, TParseError>,
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
    defaultValue?: (
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
>;

export function createEntityDefinition<
  const TAttributes extends Record<string, AttributeDefinition> = never,
  TValue = never,
  TParseError = never,
  TRefineError = never,
  TMetadata = never,
>(
  options?: CreateEntityDefinitionOptions<TAttributes, TMetadata> & {
    parse?: ParseFunction<
      Result<TValue, TParseError>,
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
    defaultValue?: (
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

  const parse =
    (options?.parse as EntityDefinition<
      TAttributes,
      TValue,
      TParseError,
      TRefineError,
      TMetadata
    >["parse"]) ?? forbiddenValueHandler;

  const refine = (
    options?.parse
      ? (secondOptions?.refine ?? ((value) => ({ success: true, value })))
      : forbiddenValueHandler
  ) as EntityDefinition<
    TAttributes,
    TValue,
    TParseError,
    TRefineError,
    TMetadata
  >["refine"];

  return {
    ...options,
    metadata: options?.metadata as TMetadata,
    childrenAllowed: options?.childrenAllowed ?? false,
    parentRequired: options?.parentRequired ?? false,
    parentAllowed: options?.parentAllowed ?? true,
    attributes: options?.attributes ?? ({} as TAttributes),
    valueAllowed: Boolean(options?.parse),
    attributeOverrides:
      (options?.attributeOverrides as EntityDefinition["attributeOverrides"]) ??
      {},
    parse,
    refine,
    shouldBeProcessed: options?.shouldBeProcessed
      ? options?.shouldBeProcessed.bind(options)
      : () => true,
    ...(options?.defaultValue
      ? {
          defaultValue: options.defaultValue.bind(options),
        }
      : {}),
  };
}
