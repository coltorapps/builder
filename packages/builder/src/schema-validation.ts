import { Array, Data, Effect, Either, Option, pipe, Record } from "effect";
import { type ReadonlyRecord } from "effect/Record";

import { type AttributeRefineError } from "./attribute";
import { type Builder, type BuilderSchemaRefineError } from "./builder";
import {
  parseSchemaEffectfully,
  type ParsedEntity,
  type ParsedSchema,
  type SchemaParseError,
} from "./schema-parsing";
import { asResult, type Result } from "./utils";

export type ValidatedEntity<
  TBuilder extends Builder = Builder,
  TType extends string = string,
> = Omit<ParsedEntity<TBuilder, TType>, "attributes"> & {
  attributes: Required<
    Exclude<ParsedEntity<TBuilder, TType>["attributes"], undefined>
  >;
};

export interface ValidatedSchema<TBuilder extends Builder = Builder> {
  readonly entities: ReadonlyRecord<
    string,
    {
      [K in keyof TBuilder["entities"] & string]: ValidatedEntity<TBuilder, K>;
    }[keyof TBuilder["entities"] & string]
  >;
  readonly root: ReadonlyArray<string>;
}

const attributeErrorsByEntityIdSymbol = Symbol("AttributeErrorsByEntityId");

export type AttributeErrorsByEntityId<TBuilder extends Builder = Builder> =
  Record<
    string,
    {
      [K in keyof TBuilder["entities"] & string]?: {
        [K2 in keyof TBuilder["entities"][K]["attributes"]]?: AttributeRefineError<
          TBuilder["entities"][K]["attributes"][K2]
        >;
      };
    }[keyof TBuilder["entities"] & string]
  > & {
    [attributeErrorsByEntityIdSymbol]: never;
  };

export class AttributesRefineError<
  TBuilder extends Builder = Builder,
> extends Data.TaggedError("AttributesRefineError")<{
  readonly errors: AttributeErrorsByEntityId<TBuilder>;
}> {}

export class SchemaRefineError<
  TBuilder extends Builder = Builder,
> extends Data.TaggedError("SchemaRefineError")<{
  readonly cause: BuilderSchemaRefineError<TBuilder>;
}> {}

type SchemaValidationResult<TBuilder extends Builder = Builder> = Result<
  ValidatedSchema<TBuilder>,
  | SchemaParseError
  | AttributesRefineError<TBuilder>
  | SchemaRefineError<TBuilder>
>;

export function refineSchemaEntities<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): Effect.Effect<
  ParsedSchema<TBuilder>["entities"],
  AttributesRefineError<TBuilder>
> {
  return pipe(
    Record.toEntries(schema.entities),
    Array.map(([entityId, entity]) =>
      pipe(
        Option.fromNullable(builder.entities[entity.type]?.attributes),
        Option.map((attributes) =>
          pipe(
            Record.toEntries(attributes),
            Array.map(([attributeName, attributeDefinition]) =>
              pipe(
                {
                  attribute: {
                    metadata: attributeDefinition.metadata,
                    name: attributeName,
                  },
                  schema,
                  entity: {
                    id: entityId,
                    type: entity.type,
                    attributes: pipe(
                      Option.fromNullable(entity.attributes),
                      Option.map((attributes) =>
                        pipe(
                          Record.toEntries(attributes),
                          Array.map(
                            ([key, value]) =>
                              [
                                key,
                                {
                                  metadata:
                                    builder.entities[entity.type]?.attributes?.[
                                      key
                                    ]?.metadata,
                                  name: key,
                                  value,
                                },
                              ] as const,
                          ),
                          Record.fromEntries,
                        ),
                      ),
                      Option.getOrElse(() => ({})),
                    ),
                    parentId: entity.parentId,
                    children: entity.children,
                    metadata: builder.entities[entity.type]?.metadata,
                  },
                },
                (baseContext) =>
                  pipe(
                    Option.fromNullable(
                      builder.entityOverrides?.[entity.type]?.attributes?.[
                        attributeName
                      ]?.refine?.bind(
                        builder.entityOverrides?.[entity.type]?.attributes?.[
                          attributeName
                        ],
                      ),
                    ),
                    Option.map(
                      (bRefine) => (val: unknown) =>
                        bRefine(val, {
                          ...baseContext,
                          refine: (innerVal) =>
                            pipe(
                              Option.fromNullable(
                                builder.entities[
                                  entity.type
                                ]?.attributeOverrides?.[
                                  attributeName
                                ]?.refine?.bind(
                                  builder.entities[entity.type]
                                    ?.attributeOverrides?.[attributeName],
                                ),
                              ),
                              Option.map((eRefine) =>
                                eRefine(innerVal, {
                                  ...baseContext,
                                  refine: (value) =>
                                    attributeDefinition.validate[1](
                                      value,
                                      baseContext,
                                    ),
                                }),
                              ),
                              Option.getOrElse(() =>
                                attributeDefinition.validate[1](
                                  innerVal,
                                  baseContext,
                                ),
                              ),
                            ),
                        }),
                    ),
                    Option.orElse(() =>
                      pipe(
                        Option.fromNullable(
                          builder.entities[entity.type]?.attributeOverrides?.[
                            attributeName
                          ]?.refine?.bind(
                            builder.entities[entity.type]?.attributeOverrides?.[
                              attributeName
                            ],
                          ),
                        ),
                        Option.map(
                          (eRefine) => (val: unknown) =>
                            eRefine(val, {
                              ...baseContext,
                              refine: (value) =>
                                attributeDefinition.validate[1](
                                  value,
                                  baseContext,
                                ),
                            }),
                        ),
                      ),
                    ),
                    Option.getOrElse(
                      () => (val: unknown) =>
                        attributeDefinition.validate[1](val, baseContext),
                    ),
                    (refineFn) =>
                      pipe(
                        Effect.promise(() =>
                          Promise.resolve(
                            refineFn(entity.attributes?.[attributeName]),
                          ),
                        ),
                        Effect.map((res) =>
                          res.success
                            ? {
                                entityId,
                                entityType: entity.type,
                                attributeName,
                                success: true as const,
                                value: res.value,
                              }
                            : {
                                entityId,
                                entityType: entity.type,
                                attributeName,
                                success: false as const,
                                error: res.error,
                              },
                        ),
                      ),
                  ),
              ),
            ),
          ),
        ),
        Option.getOrElse(() => [] as const),
        Effect.all,
      ),
    ),
    Effect.all,
    Effect.map(Array.flatten),
    Effect.flatMap((results) =>
      pipe(
        results,
        Array.partitionMap((r) =>
          r.success ? Either.right(r) : Either.left(r),
        ),
        ([failures, successes]) =>
          pipe(
            failures,
            Array.match({
              onEmpty: () =>
                Effect.succeed(
                  pipe(
                    successes,
                    Array.groupBy((s) => s.entityId),
                    Record.map((entitySuccesses) =>
                      pipe(
                        entitySuccesses,
                        Array.map((s) => [s.attributeName, s.value] as const),
                        Record.fromEntries,
                      ),
                    ),
                    (attrsByEntity) =>
                      pipe(
                        schema.entities,
                        Record.map((entity, id) => ({
                          ...entity,
                          attributes: {
                            ...entity.attributes,
                            ...attrsByEntity[id],
                          },
                        })),
                      ),
                  ),
                ),
              onNonEmpty: (errors) =>
                Effect.fail(
                  new AttributesRefineError<TBuilder>({
                    errors: pipe(
                      Array.groupBy(errors, (error) => error.entityId),
                      Record.map((entityErrors) =>
                        pipe(
                          entityErrors,
                          Array.map(
                            (err) => [err.attributeName, err.error] as const,
                          ),
                          Record.fromEntries,
                        ),
                      ),
                    ) as AttributesRefineError<TBuilder>["errors"],
                  }),
                ),
            }),
          ),
      ),
    ),
  );
}

function refineSchema<TBuilder extends Builder>(
  schema: ValidatedSchema<TBuilder>,
  builder: TBuilder,
): Effect.Effect<ValidatedSchema<TBuilder>, SchemaRefineError<TBuilder>> {
  return pipe(
    Effect.promise(() => Promise.resolve(builder.refineSchema(schema))),
    Effect.flatMap((result) =>
      result.success
        ? Effect.succeed(result.value as ValidatedSchema<TBuilder>)
        : Effect.fail(
            new SchemaRefineError({
              cause: result.error,
            }),
          ),
    ),
  );
}

export function validateSchemaEffectfully<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): Effect.Effect<
  ValidatedSchema<TBuilder>,
  | SchemaParseError
  | AttributesRefineError<TBuilder>
  | SchemaRefineError<TBuilder>
> {
  return pipe(
    parseSchemaEffectfully(input, builder, {
      parseUndefinedAttributes: true,
    }),
    Effect.flatMap((schema) =>
      pipe(
        refineSchemaEntities(schema, builder),
        Effect.map((refinedEntities) => ({
          ...schema,
          entities: refinedEntities,
        })),
        Effect.flatMap((schema) =>
          refineSchema(schema as ValidatedSchema<TBuilder>, builder),
        ),
      ),
    ),
  );
}

export function validateSchema<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): Promise<SchemaValidationResult<TBuilder>> {
  return Effect.runPromise(asResult(validateSchemaEffectfully(input, builder)));
}
