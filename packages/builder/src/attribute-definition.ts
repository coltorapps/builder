import { Builder } from "./builder";
import { EntityDefinition } from "./entity-definition";
import { DraftSchema } from "./schema-parsing";
import {
  KeyofStringIntersection,
  normalizeResult,
  ParseFunction,
  RefineFunction,
  RefineResult,
  Result,
  UnnormalizedParseFunction,
  UnnormalizedRefineFunction,
  UnnormalizedRefineResult,
  UnnormalizedResult,
} from "./utils";

export interface ContextAttributeDefinition<
  TAttribute extends AttributeDefinition = AttributeDefinition,
  TAttributeName extends string = string,
> {
  readonly metadata: TAttribute["metadata"];
  readonly name: TAttributeName;
}

export interface AttributeDefinitionParseContext<
  TAttribute extends AttributeDefinition = AttributeDefinition,
> {
  readonly attribute: ContextAttributeDefinition<TAttribute>;
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
  readonly attribute: ContextAttributeDefinition<TAttribute, TAttributeName>;
  readonly schema: DraftSchema<TBuilder>;
  readonly entity: {
    readonly id: string;
    readonly type: TEntityType;
    readonly attributes: {
      [K in KeyofStringIntersection<TEntity["attributes"]>]: {
        readonly metadata: TEntity["attributes"][K]["metadata"];
        readonly name: K;
        readonly value:
          | InferAttributeDefinitionParsedValue<TEntity["attributes"][K]>
          | undefined;
      };
    };
    readonly parentId: string | undefined;
    readonly children: ReadonlyArray<string> | undefined;
    readonly metadata: TEntity["metadata"];
  };
}

export interface AttributeDefinition<
  TValue = unknown,
  TParseError = unknown,
  TRefineError = unknown,
  TMetadata = unknown,
> {
  readonly parse: ParseFunction<
    Result<TValue, TParseError>,
    AttributeDefinitionParseContext<
      AttributeDefinition<unknown, unknown, unknown, TMetadata>
    >
  >;
  readonly refine: RefineFunction<
    unknown,
    RefineResult<TValue, TRefineError>,
    AttributeDefinitionRefineContext<
      AttributeDefinition<unknown, unknown, unknown, TMetadata>
    >
  >;
  readonly defaultValue?: (
    ctx: AttributeDefinitionDefaultValueContext<
      AttributeDefinition<unknown, unknown, unknown, TMetadata>
    >,
  ) => TValue;
  readonly metadata: TMetadata;
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

export type InferAttributeDefinitionError<
  TAttribute extends AttributeDefinition,
> =
  | InferAttributeDefinitionParseError<TAttribute>
  | InferAttributeDefinitionRefineError<TAttribute>;

export function createAttributeDefinition<
  TValue = never,
  TParseError = never,
  TRefineError = never,
  TMetadata = never,
>(
  options: {
    metadata?: TMetadata;
    parse: UnnormalizedParseFunction<
      UnnormalizedResult<TValue, TParseError>,
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
    refine?: UnnormalizedRefineFunction<
      TValue,
      UnnormalizedRefineResult<TValue, TRefineError>,
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
    ...options,
    parse: (...args) =>
      normalizeResult(
        options.parse(...(args as Parameters<typeof options.parse>)),
      ),
    refine: async (...args) =>
      secondOptions?.refine
        ? normalizeResult(
            await secondOptions.refine(
              ...(args as Parameters<typeof secondOptions.refine>),
            ),
          )
        : { success: true, value: args[0] as TValue },
    metadata: options?.metadata as TMetadata,
  };
}
