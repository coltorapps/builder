import {
  type Attribute,
  type AttributeRefineContext,
  type InferAttributeParsedValue,
  type InferAttributeRefineResult,
} from "./attribute";
import { type Builder } from "./builder";
import { type ParsedSchema } from "./schema-parsing";
import type {
  KeyofStringIntersection,
  ParseFunction,
  RefineFunction,
  RefineResult,
  Result,
} from "./utils";

export interface ContextEntity<
  TEntity extends Entity = Entity,
  TType extends string = string,
> {
  id: string;
  type: TType;
  attributes: {
    [K in KeyofStringIntersection<TEntity["attributes"]>]: {
      metadata: TEntity["attributes"][K]["metadata"];
      name: K;
      value: InferAttributeParsedValue<TEntity["attributes"][K]>;
    };
  };
  parentId?: string | undefined;
  children?: ReadonlyArray<string> | undefined;
  metadata: TEntity["metadata"];
}

export interface ContextEntityWithValue<
  TEntity extends Entity = Entity,
  TType extends string = string,
> extends ContextEntity<TEntity, TType> {
  value?: InferEntityParsedValue<TEntity>;
}

export interface EntityParseContext<
  TEntity extends Entity = Entity,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> {
  entity: ContextEntity<TEntity, TType>;
  schema: ParsedSchema<TBuilder>;
}

export interface EntityRefineContext<
  TEntity extends Entity = Entity,
  TType extends string = string,
  TBuilder extends Builder = Builder,
> {
  entity: ContextEntity<TEntity, TType>;
  schema: ParsedSchema<TBuilder>;
  entities: Record<
    string,
    {
      [K in KeyofStringIntersection<
        TBuilder["entities"]
      >]: ContextEntityWithValue<TBuilder["entities"][K], K>;
    }[KeyofStringIntersection<TBuilder["entities"]>]
  >;
}

export type EntityDefaultValueContext<TEntity extends Entity = Entity> =
  EntityRefineContext<TEntity>;

export type EntityShouldBeProcessedContext<TEntity extends Entity = Entity> =
  EntityRefineContext<TEntity>;

interface AttributeRefineOverrideContext<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends string = string,
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> extends AttributeRefineContext<
    TAttribute,
    TAttributeName,
    TEntity,
    TEntityType,
    TBuilder
  > {
  refine(
    value: InferAttributeParsedValue<TAttribute>,
  ): InferAttributeRefineResult<TAttribute>;
}

export interface AttributeOverride<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends string = string,
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  refine?(
    value: InferAttributeParsedValue<TAttribute>,
    context: AttributeRefineOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TBuilder
    >,
  ): InferAttributeRefineResult<TAttribute>;
}

export interface AttributeOverrideInput<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends string = string,
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  refine?(
    value: InferAttributeParsedValue<TAttribute>,
    context: AttributeRefineOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TBuilder
    >,
  ): InferAttributeRefineResult<TAttribute>;
}

export interface Entity<
  TAttributes extends Record<string, Attribute> = Record<string, Attribute>,
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
  attributeOverrides: Record<string, AttributeOverride>;
  parse: ParseFunction<Result<TValue, TParseError>, EntityParseContext>;
  refine: RefineFunction<
    unknown,
    RefineResult<TValue, TRefineError>,
    EntityRefineContext
  >;
  defaultValue?(
    context: EntityDefaultValueContext<
      Entity<TAttributes, unknown, unknown, unknown, TMetadata>
    >,
  ): unknown;
  shouldBeProcessed(
    context: EntityShouldBeProcessedContext<
      Entity<TAttributes, unknown, unknown, unknown, TMetadata>
    >,
  ): boolean;
  metadata: TMetadata;
}

export type InferEntityParseResult<TEntity extends Entity> = ReturnType<
  TEntity["parse"]
>;

export type InferEntityParseError<TEntity extends Entity> = Extract<
  InferEntityParseResult<TEntity>,
  { success: false }
>["error"];

export type InferEntityParsedValue<TEntity extends Entity> = Extract<
  InferEntityParseResult<TEntity>,
  { success: true }
>["value"];

export type InferEntityRefineResult<TEntity extends Entity> = ReturnType<
  TEntity["refine"]
>;

export type InferEntityRefineError<TEntity extends Entity> = Extract<
  InferEntityRefineResult<TEntity>,
  { success: false }
>["error"];

type CreateEntityBaseOptions<
  TAttributes extends Record<string, Attribute>,
  TMetadata,
> = {
  attributeOverrides?: {
    [K in KeyofStringIntersection<TAttributes>]?: AttributeOverrideInput<
      TAttributes[K],
      K,
      Entity<TAttributes, unknown, unknown, unknown, NoInfer<TMetadata>>
    >;
  };
  attributes?: TAttributes;
  childrenAllowed?: boolean;
  parentAllowed?: boolean;
  parentRequired?: boolean;
  shouldBeProcessed?(
    context: EntityRefineContext<
      Entity<TAttributes, unknown, unknown, unknown, NoInfer<TMetadata>>
    >,
  ): boolean;
  metadata?: TMetadata;
};

type CreateEntitySecondOptions<
  TValue,
  TRefineError,
  TAttributes extends Record<string, Attribute>,
  TMetadata,
> = {
  refine?: RefineFunction<
    TValue,
    RefineResult<TValue, TRefineError>,
    EntityRefineContext<
      Entity<TAttributes, unknown, unknown, unknown, NoInfer<TMetadata>>
    >
  >;
};

export function createEntity<
  const TAttributes extends Record<string, Attribute> = never,
  TMetadata = never,
>(
  options?: CreateEntityBaseOptions<TAttributes, TMetadata> & {
    parse?: never;
    defaultValue?: never;
  },
): Entity<NoInfer<TAttributes>, never, never, never, NoInfer<TMetadata>>;

export function createEntity<
  const TAttributes extends Record<string, Attribute> = never,
  TValue = never,
  TParseError = never,
  TRefineError = never,
  TMetadata = never,
>(
  options: CreateEntityBaseOptions<TAttributes, TMetadata> & {
    parse: ParseFunction<
      Result<TValue, TParseError>,
      EntityParseContext<
        Entity<TAttributes, unknown, unknown, unknown, NoInfer<TMetadata>>
      >
    >;
    defaultValue?: (
      context: EntityDefaultValueContext<
        Entity<TAttributes, unknown, unknown, unknown, TMetadata>
      >,
    ) => TValue;
  },
  secondOptions?: CreateEntitySecondOptions<
    TValue,
    TRefineError,
    TAttributes,
    TMetadata
  >,
): Entity<
  NoInfer<TAttributes>,
  NoInfer<TValue>,
  NoInfer<TParseError>,
  NoInfer<TRefineError>,
  NoInfer<TMetadata>
>;

export function createEntity<
  const TAttributes extends Record<string, Attribute> = never,
  TValue = never,
  TParseError = never,
  TRefineError = never,
  TMetadata = never,
>(
  options?: CreateEntityBaseOptions<TAttributes, TMetadata> & {
    parse?: ParseFunction<
      Result<TValue, TParseError>,
      EntityParseContext<
        Entity<TAttributes, unknown, unknown, unknown, NoInfer<TMetadata>>
      >
    >;
    defaultValue?: (
      context: EntityDefaultValueContext<
        Entity<TAttributes, unknown, unknown, unknown, TMetadata>
      >,
    ) => TValue;
  },
  secondOptions?: CreateEntitySecondOptions<
    TValue,
    TRefineError,
    TAttributes,
    TMetadata
  >,
): Entity<
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
    (options?.parse as Entity<
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
  ) as Entity<
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
      (options?.attributeOverrides as Entity["attributeOverrides"]) ?? {},
    parse,
    refine,
    shouldBeProcessed: options?.shouldBeProcessed
      ? options?.shouldBeProcessed.bind(options)
      : () => true,
    ...(options?.defaultValue && {
      defaultValue: options.defaultValue.bind(options),
    }),
  };
}
