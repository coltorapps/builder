import {
  type Attribute,
  type AttributeParsedValue,
  type AttributeRefineContext,
  type AttributeRefineResult,
} from "./attribute";
import { type Builder } from "./builder";
import { type ParsedSchema } from "./schema-parsing";
import type {
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
    [K in keyof TEntity["attributes"] & string]: {
      metadata: TEntity["attributes"][K]["metadata"];
      name: K;
      value: AttributeParsedValue<TEntity["attributes"][K]>;
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
  value?: EntityParsedValue<TEntity>;
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
  schema: ParsedSchema<Builder>;
  entities: Record<
    string,
    {
      [K in keyof TBuilder["entities"] & string]: ContextEntityWithValue<
        TBuilder["entities"][K],
        K
      >;
    }[keyof TBuilder["entities"] & string]
  >;
}

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
    value: AttributeParsedValue<TAttribute>,
  ): AttributeRefineResult<TAttribute>;
}

export interface AttributeOverride<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends string = string,
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  refine?(
    value: AttributeParsedValue<TAttribute>,
    context: AttributeRefineOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TBuilder
    >,
  ): AttributeRefineResult<TAttribute>;
}

export interface AttributeOverrideInput<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends string = string,
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  refine?(
    value: AttributeParsedValue<TAttribute>,
    context: AttributeRefineOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TBuilder
    >,
  ): AttributeRefineResult<TAttribute>;
}

export interface Entity<
  TAttributes extends Record<string, Attribute> = Record<string, Attribute>,
  TValue = unknown,
  TRefineError = unknown,
  TMetadata = unknown,
> {
  attributes: TAttributes;
  valueAllowed: boolean;
  childrenAllowed: boolean;
  parentAllowed: boolean;
  parentRequired: boolean;
  attributeOverrides: Record<string, AttributeOverride>;
  validate: [
    parse: ParseFunction<Result<TValue>, EntityParseContext>,
    refine: RefineFunction<
      unknown,
      RefineResult<TValue, TRefineError>,
      EntityRefineContext
    >,
  ];
  defaultValue(
    context: EntityRefineContext<
      Entity<TAttributes, unknown, boolean, TMetadata>
    >,
  ): unknown;
  shouldBeProcessed(
    context: EntityRefineContext<
      Entity<TAttributes, unknown, boolean, TMetadata>
    >,
  ): boolean;
  metadata: TMetadata;
}

export type EntityParsedValue<TEntity extends Entity> = Extract<
  ReturnType<TEntity["validate"][0]>,
  { success: true }
>["value"];

export type EntityRefineResult<TEntity extends Entity> = ReturnType<
  TEntity["validate"][1]
>;

export type EntityRefineError<TEntity extends Entity> = Extract<
  EntityRefineResult<TEntity>,
  { success: false }
>["error"];

export function createEntity<
  const TAttributes extends Record<string, Attribute> = never,
  TValue = never,
  TRefineError = never,
  TMetadata = never,
>(
  options?: {
    attributeOverrides?: {
      [K in keyof TAttributes & string]?: AttributeOverrideInput<
        TAttributes[K],
        K,
        Entity<TAttributes, unknown, boolean, NoInfer<TMetadata>>
      >;
    };
    attributes?: TAttributes;
    childrenAllowed?: boolean;
    parentAllowed?: boolean;
    parentRequired?: boolean;
    defaultValue?(
      context: EntityRefineContext<
        Entity<TAttributes, unknown, boolean, NoInfer<TMetadata>>
      >,
    ): NoInfer<TValue>;
    shouldBeProcessed?(
      context: EntityRefineContext<
        Entity<TAttributes, unknown, boolean, NoInfer<TMetadata>>
      >,
    ): boolean;
    metadata?: TMetadata;
  } & (
    | {
        validate?: ParseFunction<
          Result<TValue>,
          EntityParseContext<
            Entity<TAttributes, unknown, unknown, NoInfer<TMetadata>>
          >
        >;
      }
    | {
        validate?: [
          parse: ParseFunction<
            Result<TValue>,
            EntityParseContext<
              Entity<TAttributes, unknown, unknown, NoInfer<TMetadata>>
            >
          >,
          refine: RefineFunction<
            TValue,
            RefineResult<TValue, TRefineError>,
            EntityRefineContext<
              Entity<TAttributes, unknown, unknown, NoInfer<TMetadata>>
            >
          >,
        ];
      }
  ),
): Entity<
  NoInfer<TAttributes>,
  NoInfer<TValue>,
  NoInfer<TRefineError>,
  NoInfer<TMetadata>
> {
  const forbidenValueErrorMessage = "Value not allowed.";

  const validate = (
    options?.validate
      ? Array.isArray(options.validate)
        ? options.validate
        : [
            options.validate,
            (value: unknown) => ({ success: true, value: value }),
          ]
      : [
          () => {
            throw new Error(forbidenValueErrorMessage);
          },
          () => {
            throw new Error(forbidenValueErrorMessage);
          },
        ]
  ) as Entity<TAttributes, TValue, TRefineError, TMetadata>["validate"];

  return {
    ...options,
    metadata: options?.metadata as TMetadata,
    childrenAllowed: options?.childrenAllowed ?? false,
    parentRequired: options?.parentRequired ?? false,
    parentAllowed: options?.parentAllowed ?? true,
    attributes: options?.attributes ?? ({} as TAttributes),
    valueAllowed: Boolean(options?.validate),
    attributeOverrides:
      (options?.attributeOverrides as Entity["attributeOverrides"]) ?? {},
    validate,
    defaultValue: options?.defaultValue
      ? (...args) => options?.defaultValue?.(...args)
      : () => undefined as never,
    shouldBeProcessed: options?.shouldBeProcessed
      ? (...args) => options?.shouldBeProcessed?.(...args) ?? true
      : () => true,
  };
}
