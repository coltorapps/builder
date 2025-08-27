import { Array, Data, Effect, Either, Option, pipe, Record } from "effect";
import { type ReadonlyRecord } from "effect/Record";

import { type AttributeDefinition } from "./attribute-definition";
import { type Builder, type InferBuilderSchemaRefineError } from "./builder";
import {
  cleanDraftSchemaEntity,
  parseDraftSchemaWithOptions,
  parseEntityAttribute,
  type DraftSchema,
  type DraftSchemaEntity,
  type SchemaParseError,
} from "./schema-parsing";
import {
  runPromiseAsResult,
  type KeyofStringIntersection,
  type Result,
} from "./utils";

export type ValidatedSchemaEntity<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> = Omit<DraftSchemaEntity<TBuilder, TType>, "attributes"> & {
  readonly attributes: Required<
    Exclude<DraftSchemaEntity<TBuilder, TType>["attributes"], undefined>
  >;
};

export interface ValidatedSchema<TBuilder extends Builder = Builder> {
  readonly entities: ReadonlyRecord<
    string,
    {
      [K in KeyofStringIntersection<
        TBuilder["entities"]
      >]: ValidatedSchemaEntity<TBuilder, K>;
    }[KeyofStringIntersection<TBuilder["entities"]>]
  >;
  readonly root: ReadonlyArray<string>;
}

export type EntityAttributesErrors = Record<string, unknown>;

export type EntitiesAttributesErrors = Record<string, EntityAttributesErrors>;

export class EntityAttributeValidationError extends Data.TaggedError(
  "EntityAttributeValidationError",
)<{
  readonly entityId: string;
  readonly entityType: string;
  readonly attributeName: string;
  readonly cause: unknown;
}> {}

export class EntityAttributesValidationError extends Data.TaggedError(
  "EntityAttributesValidationError",
)<{
  readonly errors: EntityAttributesErrors;
}> {}

export class EntitiesAttributesValidationError extends Data.TaggedError(
  "EntitiesAttributesValidationError",
)<{
  readonly errors: EntitiesAttributesErrors;
}> {}

export class SchemaRefineError<
  TBuilder extends Builder = Builder,
> extends Data.TaggedError("SchemaRefineError")<{
  readonly cause: InferBuilderSchemaRefineError<TBuilder>;
}> {}

type SchemaValidationResult<TBuilder extends Builder = Builder> = Result<
  ValidatedSchema<TBuilder>,
  SchemaParseError | EntitiesAttributesValidationError | SchemaRefineError
>;

export function validateEntityAttribute(
  entityId: string,
  entity: DraftSchemaEntity,
  attributeName: string,
  attributeValue: unknown,
  attributeDefinition: AttributeDefinition,
  schema: DraftSchema,
  builder: Builder,
): Effect.Effect<Either.Either<unknown, unknown>> {
  return pipe(
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
          Option.fromNullable(schema.entities[entityId]?.attributes),
          Option.map((attributes) =>
            pipe(
              Record.toEntries(attributes),
              Array.map(
                ([key, value]) =>
                  [
                    key,
                    {
                      metadata:
                        builder.entities[entity.type]?.attributes?.[key]
                          ?.metadata,
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
        parentId: schema.entities[entityId]?.parentId,
        children: schema.entities[entityId]?.children,
        metadata: builder.entities[entity.type]?.metadata,
      },
    },
    (baseContext) =>
      pipe(
        Option.fromNullable(
          builder.entityOverrides?.[entity.type]?.attributes?.[
            attributeName
          ]?.refine?.bind(
            builder.entityOverrides?.[entity.type]?.attributes?.[attributeName],
          ),
        ),
        Option.map(
          (bRefine) => (val: unknown) =>
            bRefine(val, {
              ...baseContext,
              refine: (innerVal) =>
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
                  Option.map((eRefine) =>
                    eRefine(innerVal, {
                      ...baseContext,
                      refine: (value) =>
                        attributeDefinition.refine(value, baseContext),
                    }),
                  ),
                  Option.getOrElse(() =>
                    attributeDefinition.refine(innerVal, baseContext),
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
                    attributeDefinition.refine(value, baseContext),
                }),
            ),
          ),
        ),
        Option.getOrElse(
          () => (val: unknown) => attributeDefinition.refine(val, baseContext),
        ),
        (refineFn) =>
          pipe(
            !Boolean(entity.attributes && attributeName in entity.attributes)
              ? parseEntityAttribute(
                  attributeName,
                  attributeValue,
                  attributeDefinition,
                )
              : Either.right(attributeValue),
            Either.match({
              onLeft: (error) => Effect.succeed(Either.left(error)),
              onRight: (parsedValue) =>
                pipe(
                  Effect.promise(() => Promise.resolve(refineFn(parsedValue))),
                  Effect.map((result) =>
                    result.success
                      ? Either.right(result.value)
                      : Either.left(result.error),
                  ),
                ),
            }),
          ),
      ),
  );
}

export function validateEntityAttributes(
  entityId: string,
  entity: DraftSchemaEntity,
  schema: DraftSchema,
  builder: Builder,
): Effect.Effect<{
  errors: EntityAttributesErrors;
  values: DraftSchemaEntity["attributes"];
}> {
  return pipe(
    Option.fromNullable(builder.entities[entity.type]?.attributes),
    Option.map((attributes) =>
      pipe(
        Record.toEntries(attributes),
        Array.map(([attributeName, attributeDefinition]) =>
          pipe(
            validateEntityAttribute(
              entityId,
              entity,
              attributeName,
              entity.attributes?.[attributeName],
              attributeDefinition,
              schema,
              builder,
            ),
            Effect.map((eitherResult) =>
              Either.match(eitherResult, {
                onLeft: (error) => [attributeName, Either.left(error)] as const,
                onRight: (value) =>
                  [attributeName, Either.right(value)] as const,
              }),
            ),
          ),
        ),
        Effect.all,
        Effect.map((results) =>
          pipe(
            Array.partitionMap(results, ([attributeName, either]) =>
              Either.match(either, {
                onLeft: (error) => Either.left([attributeName, error] as const),
                onRight: (value) =>
                  Either.right([attributeName, value] as const),
              }),
            ),
            ([errors, values]) => ({
              errors: Record.fromEntries(errors),
              values: Record.fromEntries(values),
            }),
          ),
        ),
      ),
    ),
    Option.getOrElse(() => Effect.succeed({ errors: {}, values: {} })),
  );
}

export function cleanEntitiesAttributeErrors(
  entitiesAttributeErrors: EntitiesAttributesErrors,
): EntitiesAttributesErrors {
  return pipe(
    entitiesAttributeErrors,
    Record.filter((entityErrors) => !Record.isEmptyRecord(entityErrors)),
  );
}

export function validateEntitiesAttributes(
  schema: DraftSchema,
  builder: Builder,
): Effect.Effect<{
  entities: DraftSchema["entities"];
  attributeErrors: EntitiesAttributesErrors;
}> {
  return pipe(
    Record.toEntries(schema.entities),
    Array.map(([entityId, entity]) =>
      pipe(
        validateEntityAttributes(entityId, entity, schema, builder),
        Effect.map((result) => [entityId, result, entity] as const),
      ),
    ),
    Effect.all,
    Effect.map((entityResults) =>
      pipe(entityResults, (results) => ({
        entities: pipe(
          results,
          Array.map(
            ([entityId, result, entity]) =>
              [
                entityId,
                cleanDraftSchemaEntity({
                  ...entity,
                  attributes: result.values,
                }),
              ] as const,
          ),
          Record.fromEntries,
        ),
        attributeErrors: pipe(
          results,
          Array.filterMap(([entityId, result]) =>
            Record.isEmptyRecord(result.errors)
              ? Option.none()
              : Option.some([entityId, result.errors] as const),
          ),
          Record.fromEntries,
          cleanEntitiesAttributeErrors,
        ),
      })),
    ),
  );
}

export function refineSchema<TBuilder extends Builder>(
  schema: ValidatedSchema<TBuilder>,
  builder: TBuilder,
): Effect.Effect<ValidatedSchema<TBuilder>, SchemaRefineError> {
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
  SchemaParseError | EntitiesAttributesValidationError | SchemaRefineError
> {
  return pipe(
    parseDraftSchemaWithOptions(input, builder, {
      parseMissingAttributes: true,
    }),
    Effect.flatMap((schema) =>
      pipe(
        validateEntitiesAttributes(schema, builder),
        Effect.flatMap((result) =>
          pipe(
            Effect.if(Record.isEmptyRecord(result.attributeErrors), {
              onTrue: () => Effect.succeed(result.entities),
              onFalse: () =>
                Effect.fail(
                  new EntitiesAttributesValidationError({
                    errors: result.attributeErrors,
                  }),
                ),
            }),
          ),
        ),
        Effect.flatMap((entities) =>
          refineSchema(
            { ...schema, entities } as ValidatedSchema<TBuilder>,
            builder,
          ),
        ),
      ),
    ),
  );
}

export function validateSchema<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): Promise<SchemaValidationResult<TBuilder>> {
  return runPromiseAsResult(validateSchemaEffectfully(input, builder));
}
