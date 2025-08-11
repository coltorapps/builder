import type { Builder } from "./builder";
import { type Entity } from "./entity";
import { type ParsedSchema } from "./schema-parsing";
import type {
  ParseFunction,
  RefineFunction,
  RefineResult,
  Result,
} from "./utils";

export interface ContextAttribute<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends PropertyKey = PropertyKey,
> {
  metadata: TAttribute["metadata"];
  name: TAttributeName;
}

export interface AttributeParseContext<
  TAttribute extends Attribute = Attribute,
> {
  attribute: ContextAttribute<TAttribute>;
}

export interface AttributeRefineContext<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends PropertyKey = PropertyKey,
  TEntity extends Entity = Entity,
  TEntityType extends PropertyKey = PropertyKey,
  TBuilder extends Builder = Builder,
> {
  attribute: ContextAttribute<TAttribute, TAttributeName>;
  schema: ParsedSchema<TBuilder>;
  entity: {
    id: string;
    type: TEntityType;
    attributes: {
      [K in keyof TEntity["attributes"] & string]: {
        metadata: TEntity["attributes"][K]["metadata"];
        name: K;
        value?: AttributeParsedValue<TEntity["attributes"][K]>;
      };
    };
    parentId?: string | undefined;
    children?: ReadonlyArray<string> | undefined;
    metadata: TEntity["metadata"];
  };
}

export interface Attribute<
  TValue = unknown,
  TRefineError = unknown,
  TMetadata = unknown,
> {
  validate: [
    parse: ParseFunction<Result<TValue>, AttributeParseContext>,
    refine: RefineFunction<
      unknown,
      RefineResult<TValue, TRefineError>,
      AttributeRefineContext
    >,
  ];
  defaultValue(): unknown;
  metadata: TMetadata;
}

export type AttributeParsedValue<TAttribute extends Attribute> = Extract<
  ReturnType<TAttribute["validate"][0]>,
  { success: true }
>["value"];

export type AttributeRefineResult<TAttribute extends Attribute> = ReturnType<
  TAttribute["validate"][1]
>;

export type AttributeRefineError<TAttribute extends Attribute> = Extract<
  AttributeRefineResult<TAttribute>,
  { success: false }
>["error"];

export function createAttribute<
  TValue = never,
  TRefineError = never,
  TMetadata = never,
>(
  options: {
    defaultValue?: () => NoInfer<TValue>;
    metadata?: TMetadata;
  } & (
    | {
        validate: ParseFunction<
          Result<TValue>,
          AttributeParseContext<Attribute<unknown, unknown, TMetadata>>
        >;
      }
    | {
        validate: [
          parse: ParseFunction<
            Result<TValue>,
            AttributeParseContext<Attribute<unknown, unknown, TMetadata>>
          >,
          refine: RefineFunction<
            TValue,
            RefineResult<TValue, TRefineError>,
            AttributeRefineContext<Attribute<unknown, unknown, TMetadata>>
          >,
        ];
      }
  ),
): Attribute<NoInfer<TValue>, NoInfer<TRefineError>, NoInfer<TMetadata>> {
  const validate = (
    Array.isArray(options.validate)
      ? options.validate
      : [options.validate, (value: unknown) => ({ success: true, value: value })]
  ) as Attribute<TValue, TRefineError, TMetadata>["validate"];

  return {
    validate,
    defaultValue: options.defaultValue ?? (() => undefined),
    metadata: options?.metadata as TMetadata,
  };
}
