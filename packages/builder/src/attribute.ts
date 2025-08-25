import type { Builder } from "./builder";
import { type Entity } from "./entity";
import { type ParsedSchema } from "./schema-parsing";
import type {
  KeyofStringIntersection,
  ParseFunction,
  RefineFunction,
  RefineResult,
  Result,
} from "./utils";

export interface ContextAttribute<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends string = string,
> {
  metadata: TAttribute["metadata"];
  name: TAttributeName;
}

export interface AttributeBaseContext<
  TAttribute extends Attribute = Attribute,
> {
  attribute: ContextAttribute<TAttribute>;
}

export interface AttributeRefineContext<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends string = string,
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  attribute: ContextAttribute<TAttribute, TAttributeName>;
  schema: ParsedSchema<TBuilder>;
  entity: {
    id: string;
    type: TEntityType;
    attributes: {
      [K in KeyofStringIntersection<TEntity["attributes"]>]: {
        metadata: TEntity["attributes"][K]["metadata"];
        name: K;
        value?: InferAttributeParsedValue<TEntity["attributes"][K]>;
      };
    };
    parentId?: string | undefined;
    children?: ReadonlyArray<string> | undefined;
    metadata: TEntity["metadata"];
  };
}

export interface Attribute<
  TValue = unknown,
  TParseError = unknown,
  TRefineError = unknown,
  TMetadata = unknown,
> {
  parse: ParseFunction<Result<TValue, TParseError>, AttributeBaseContext>;
  refine: RefineFunction<
    unknown,
    RefineResult<TValue, TRefineError>,
    AttributeRefineContext
  >;
  defaultValue?(ctx: AttributeBaseContext): TValue;
  metadata: TMetadata;
}

export type InferAttributeParseResult<TAttribute extends Attribute> =
  ReturnType<TAttribute["parse"]>;

export type InferAttributeParseError<TAttribute extends Attribute> = Extract<
  InferAttributeParseResult<TAttribute>,
  { success: false }
>["error"];

export type InferAttributeParsedValue<TAttribute extends Attribute> = Extract<
  InferAttributeParseResult<TAttribute>,
  { success: true }
>["value"];

export type InferAttributeRefineResult<TAttribute extends Attribute> =
  ReturnType<TAttribute["refine"]>;

export type InferAttributeRefineError<TAttribute extends Attribute> = Extract<
  InferAttributeRefineResult<TAttribute>,
  { success: false }
>["error"];

export function createAttribute<
  TValue = never,
  TParseError = never,
  TRefineError = never,
  TMetadata = never,
>(
  options: {
    metadata?: TMetadata;
    parse: ParseFunction<
      Result<TValue, TParseError>,
      AttributeBaseContext<Attribute<unknown, unknown, unknown, TMetadata>>
    >;
    defaultValue?(
      ctx: AttributeBaseContext<
        Attribute<unknown, unknown, unknown, TMetadata>
      >,
    ): TValue;
  },
  secondOptions?: {
    refine?: RefineFunction<
      TValue,
      RefineResult<TValue, TRefineError>,
      AttributeRefineContext<Attribute<unknown, unknown, unknown, TMetadata>>
    >;
  },
): Attribute<
  NoInfer<TValue>,
  NoInfer<TParseError>,
  NoInfer<TRefineError>,
  NoInfer<TMetadata>
> {
  return {
    parse: options.parse as Attribute<
      TValue,
      TParseError,
      TRefineError,
      TMetadata
    >["parse"],
    refine: (secondOptions?.refine ??
      ((value) => ({ success: true, value: value }))) as Attribute<
      TValue,
      TParseError,
      TRefineError,
      TMetadata
    >["refine"],
    metadata: options?.metadata as TMetadata,
    ...(options?.defaultValue && {
      defaultValue: options.defaultValue.bind(options),
    }),
  };
}
