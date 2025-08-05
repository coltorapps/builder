import type { Builder } from "./builder";
import { createEntity, type ContextEntity, type Entity } from "./entity";
import type { ParsedSchema, ParsedSchemaEntityWithId } from "./schema";
import type {
  ParsingFunction,
  PromisedRefinementResult,
  RefinementFunction,
  Result,
} from "./utils";

export interface ContextAttribute<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends PropertyKey = PropertyKey,
> {
  metadata: TAttribute["metadata"];
  name: TAttributeName;
  value?: AttributeValue<TAttribute>;
}

export interface AttributeParseContext<
  TAttribute extends Attribute = Attribute,
> {
  attribute: Omit<ContextAttribute<TAttribute>, "value">;
}

export interface AttributeRefinementContext<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends PropertyKey = PropertyKey,
  TEntity extends Entity = Entity,
  TEntityType extends PropertyKey = PropertyKey,
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> {
  attribute: Omit<ContextAttribute<TAttribute, TAttributeName>, "value">;
  schema: ParsedSchema<Builder<TEntities>>;
  entity: Omit<ContextEntity<TEntity, TEntityType>, "value">;
}

export interface Attribute<
  TValue = unknown,
  TParsingError = unknown,
  TRefinementError = unknown,
  TMetadata = unknown,
> {
  validate: [
    parse: ParsingFunction<
      Result<TValue, TParsingError>,
      AttributeParseContext
    >,
    refine: RefinementFunction<
      unknown,
      PromisedRefinementResult<TValue, TParsingError | TRefinementError>,
      AttributeRefinementContext
    >,
  ];
  defaultValue(): unknown;
  metadata: TMetadata;
}

export type AttributeValue<TAttribute extends Attribute> = Extract<
  ReturnType<TAttribute["validate"][0]>,
  { success: true }
>["data"];

export type AttributeRefinementResult<TAttribute extends Attribute> =
  ReturnType<TAttribute["validate"][1]>;

export type AttributeError<TAttribute extends Attribute> = Extract<
  AttributeRefinementResult<TAttribute>,
  { success: false }
>["error"];

export function createAttribute<
  TValue = never,
  TParsingError = never,
  TRefinementError = never,
  TMetadata = never,
>(
  options: {
    defaultValue?: () => NoInfer<TValue>;
    metadata?: TMetadata;
  } & (
    | {
        validate: ParsingFunction<
          Result<TValue, TParsingError>,
          AttributeParseContext<Attribute<unknown, unknown, TMetadata>>
        >;
      }
    | {
        validate: [
          parse: ParsingFunction<
            Result<TValue, TParsingError>,
            AttributeParseContext<Attribute<unknown, unknown, TMetadata>>
          >,
          refine: RefinementFunction<
            TValue,
            PromisedRefinementResult<TValue, TParsingError | TRefinementError>,
            AttributeRefinementContext<Attribute<unknown, unknown, TMetadata>>
          >,
        ];
      }
  ),
): Attribute<
  NoInfer<TValue>,
  NoInfer<TParsingError | TRefinementError>,
  NoInfer<TMetadata>
> {
  const validate = (
    Array.isArray(options.validate)
      ? options.validate
      : [options.validate, (value: unknown) => ({ success: true, data: value })]
  ) as Attribute<
    TValue,
    TParsingError | TRefinementError,
    TMetadata
  >["validate"];

  return {
    validate,
    defaultValue: options.defaultValue ?? (() => undefined),
    metadata: options?.metadata as TMetadata,
  };
}
