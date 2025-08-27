import type { Builder } from "./builder";
import { type EntityDefinition } from "./entity-definition";
import { type DraftSchema } from "./schema-parsing";
import type {
  KeyofStringIntersection,
  ParseFunction,
  RefineFunction,
  RefineResult,
  Result,
} from "./utils";

export interface ContextAttributeDefinition<
  TAttribute extends AttributeDefinition = AttributeDefinition,
  TAttributeName extends string = string,
> {
  metadata: TAttribute["metadata"];
  name: TAttributeName;
}

export interface AttributeDefinitionParseContext<
  TAttribute extends AttributeDefinition = AttributeDefinition,
> {
  attribute: ContextAttributeDefinition<TAttribute>;
}

export type AttributeDefinitionDefaultValueContext<
  TAttribute extends AttributeDefinition = AttributeDefinition,
> = AttributeDefinitionParseContext<TAttribute>;

export interface AttributeDefinitionRefineContext<
  TAttribute extends AttributeDefinition = AttributeDefinition,
  TAttributeName extends string = string,
  TEntity extends EntityDefinition = EntityDefinition,
  TEntityType extends string = string,
  TBuilder extends Builder = Builder,
> {
  attribute: ContextAttributeDefinition<TAttribute, TAttributeName>;
  schema: DraftSchema<TBuilder>;
  entity: {
    id: string;
    type: TEntityType;
    attributes: {
      [K in KeyofStringIntersection<TEntity["attributes"]>]: {
        metadata: TEntity["attributes"][K]["metadata"];
        name: K;
        value?: InferAttributeDefinitionParsedValue<TEntity["attributes"][K]>;
      };
    };
    parentId?: string | undefined;
    children?: ReadonlyArray<string> | undefined;
    metadata: TEntity["metadata"];
  };
}

export interface AttributeDefinition<
  TValue = unknown,
  TParseError = unknown,
  TRefineError = unknown,
  TMetadata = unknown,
> {
  parse: ParseFunction<
    Result<TValue, TParseError>,
    AttributeDefinitionParseContext
  >;
  refine: RefineFunction<
    unknown,
    RefineResult<TValue, TRefineError>,
    AttributeDefinitionRefineContext
  >;
  defaultValue?(ctx: AttributeDefinitionDefaultValueContext): TValue;
  metadata: TMetadata;
}

export type InferAttributeDefinitionParseResult<
  TAttribute extends AttributeDefinition,
> = ReturnType<TAttribute["parse"]>;

export type InferAttributeDefinitionParseError<
  TAttribute extends AttributeDefinition,
> = Extract<
  InferAttributeDefinitionParseResult<TAttribute>,
  { success: false }
>["error"];

export type InferAttributeDefinitionParsedValue<
  TAttribute extends AttributeDefinition,
> = Extract<
  InferAttributeDefinitionParseResult<TAttribute>,
  { success: true }
>["value"];

export type InferAttributeDefinitionRefineResult<
  TAttribute extends AttributeDefinition,
> = ReturnType<TAttribute["refine"]>;

export type InferAttributeDefinitionRefineError<
  TAttribute extends AttributeDefinition,
> = Extract<
  InferAttributeDefinitionRefineResult<TAttribute>,
  { success: false }
>["error"];

export function createAttributeDefinition<
  TValue = never,
  TParseError = never,
  TRefineError = never,
  TMetadata = never,
>(
  options: {
    metadata?: TMetadata;
    parse: ParseFunction<
      Result<TValue, TParseError>,
      AttributeDefinitionParseContext<
        AttributeDefinition<unknown, unknown, unknown, TMetadata>
      >
    >;
    defaultValue?(
      ctx: AttributeDefinitionDefaultValueContext<
        AttributeDefinition<unknown, unknown, unknown, TMetadata>
      >,
    ): TValue;
  },
  secondOptions?: {
    refine?: RefineFunction<
      TValue,
      RefineResult<TValue, TRefineError>,
      AttributeDefinitionRefineContext<
        AttributeDefinition<unknown, unknown, unknown, TMetadata>
      >
    >;
  },
): AttributeDefinition<
  NoInfer<TValue>,
  NoInfer<TParseError>,
  NoInfer<TRefineError>,
  NoInfer<TMetadata>
> {
  return {
    parse: options.parse as AttributeDefinition<
      TValue,
      TParseError,
      TRefineError,
      TMetadata
    >["parse"],
    refine: (secondOptions?.refine ??
      ((value) => ({ success: true, value: value }))) as AttributeDefinition<
      TValue,
      TParseError,
      TRefineError,
      TMetadata
    >["refine"],
    metadata: options?.metadata as TMetadata,
    ...(options?.defaultValue
      ? {
          defaultValue: options.defaultValue.bind(options),
        }
      : {}),
  };
}
