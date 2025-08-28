import type * as builderDefinition from "./builder-definition";
import type * as entityDefinition from "./entity-definition";
import type * as schemaParsing from "./schema-parsing";
import type * as utils from "./utils";

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
  TEntity extends
    entityDefinition.EntityDefinition = entityDefinition.EntityDefinition,
  TEntityType extends string = string,
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
> {
  attribute: ContextAttributeDefinition<TAttribute, TAttributeName>;
  schema: schemaParsing.DraftSchema<TBuilder>;
  entity: {
    id: string;
    type: TEntityType;
    attributes: {
      [K in utils.KeyofStringIntersection<TEntity["attributes"]>]: {
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
  parse: utils.ParseFunction<
    utils.Result<TValue, TParseError>,
    AttributeDefinitionParseContext
  >;
  refine: utils.RefineFunction<
    unknown,
    utils.RefineResult<TValue, TRefineError>,
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
    parse: utils.ParseFunction<
      utils.Result<TValue, TParseError>,
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
    refine?: utils.RefineFunction<
      TValue,
      utils.RefineResult<TValue, TRefineError>,
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
