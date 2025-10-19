import * as A from "effect/Array";
import * as C from "effect/Cause";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as O from "effect/Option";
import * as R from "effect/Record";

import {
  type AttributeDefinition,
  type InferAttributeDefinitionError,
} from "./attribute-definition";
import {
  type Builder,
  type BuilderBrand,
  type InferBuilderSchemaRefineError,
} from "./builder";
import {
  parseEntityAttribute,
  parseSchemaWithOptions,
  SchemaParseError,
  type DraftSchema,
  type DraftSchemaEntity,
  type ParsedSchema,
} from "./schema-parsing";
import {
  filterEmptyRecords,
  runPromiseAsResult,
  type AttributeRef,
  type EntityRef,
  type KeyofStringIntersection,
  type Result,
} from "./utils";

export type EntityAttributesValidationErrors<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> = {
  readonly [K in KeyofStringIntersection<
    TBuilder["entities"][TType]["attributes"]
  >]?: InferAttributeDefinitionError<
    TBuilder["entities"][TType]["attributes"][K]
  >;
};

export type EntitiesAttributesValidationErrors<TBuilder extends Builder> =
  R.ReadonlyRecord<
    string,
    {
      readonly [K in KeyofStringIntersection<
        TBuilder["entities"]
      >]: EntityAttributesValidationErrors<TBuilder, K>;
    }[KeyofStringIntersection<TBuilder["entities"]>]
  > &
    BuilderBrand<TBuilder, "EntitiesAttributesValidationErrors">;

export class EntityAttributeValidationError<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
  TAttributeName extends KeyofStringIntersection<
    TBuilder["entities"][TType]["attributes"]
  > = KeyofStringIntersection<TBuilder["entities"][TType]["attributes"]>,
> extends D.TaggedError("EntityAttributeValidationError")<{
  readonly attributeRef: AttributeRef<TBuilder, TType, TAttributeName>;
  readonly cause: InferAttributeDefinitionError<
    TBuilder["entities"][TType]["attributes"][TAttributeName]
  >;
}> {}

export class EntityAttributesValidationError<
  TBuilder extends Builder,
> extends D.TaggedError("EntityAttributesValidationError")<{
  readonly entityRef: EntityRef<TBuilder>;
  readonly errors: EntityAttributesValidationErrors<TBuilder>;
}> {}

export class EntitiesAttributesValidationError<
  TBuilder extends Builder,
> extends D.TaggedError("EntitiesAttributesValidationError")<{
  readonly errors: EntitiesAttributesValidationErrors<TBuilder>;
}> {}

export class SchemaRefineError<TBuilder extends Builder> extends D.TaggedError(
  "SchemaRefineError",
)<{
  readonly cause: InferBuilderSchemaRefineError<TBuilder>;
}> {}

type SchemaValidationResult<TBuilder extends Builder> = Result<
  ParsedSchema<TBuilder>,
  | EntitiesAttributesValidationError<TBuilder>
  | SchemaRefineError<TBuilder>
  | SchemaParseError<TBuilder>
>;

export function validateEntityAttribute(
  entityId: string,
  entity: DraftSchemaEntity,
  attributeName: string,
  attributeValue: unknown,
  attributeDefinition: AttributeDefinition,
  schema: DraftSchema,
  builder: Builder,
): E.Effect<Ei.Either<unknown, unknown>> {
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
          O.fromNullable(schema.entities[entityId]?.attributes),
          O.map((attributes) =>
            pipe(
              R.toEntries(attributes),
              A.map(
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
              R.fromEntries,
            ),
          ),
          O.getOrElse(() => ({})),
        ),
        parentId: schema.entities[entityId]?.parentId,
        children: schema.entities[entityId]?.children,
        metadata: builder.entities[entity.type]?.metadata,
      },
    },
    (baseContext) =>
      pipe(
        O.fromNullable(
          builder.entityOverrides?.[entity.type]?.attributes?.[attributeName]
            ?.refine,
        ),
        O.map(
          (bRefine) => (val: unknown) =>
            bRefine(val, {
              ...baseContext,
              refine: (innerVal) =>
                pipe(
                  O.fromNullable(
                    builder.entities[entity.type]?.attributeOverrides?.[
                      attributeName
                    ]?.refine,
                  ),
                  O.map((eRefine) =>
                    eRefine(innerVal, {
                      ...baseContext,
                      refine: (value) =>
                        attributeDefinition.refine(value, baseContext),
                    }),
                  ),
                  O.getOrElse(() =>
                    attributeDefinition.refine(innerVal, baseContext),
                  ),
                ),
            }),
        ),
        O.orElse(() =>
          pipe(
            O.fromNullable(
              builder.entities[entity.type]?.attributeOverrides?.[
                attributeName
              ]?.refine?.bind(
                builder.entities[entity.type]?.attributeOverrides?.[
                  attributeName
                ],
              ),
            ),
            O.map(
              (eRefine) => (val: unknown) =>
                eRefine(val, {
                  ...baseContext,
                  refine: (value) =>
                    attributeDefinition.refine(value, baseContext),
                }),
            ),
          ),
        ),
        O.getOrElse(
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
              : Ei.right(attributeValue),
            Ei.match({
              onLeft: (error) => E.succeed(Ei.left(error)),
              onRight: (parsedValue) =>
                pipe(
                  E.promise(() => Promise.resolve(refineFn(parsedValue))),
                  E.map((result) =>
                    result.success
                      ? Ei.right(result.value)
                      : Ei.left(result.error),
                  ),
                ),
            }),
          ),
      ),
  );
}

export function validateEntityAttributes<TBuilder extends Builder>(
  entityId: string,
  entity: DraftSchemaEntity<TBuilder>,
  schema: DraftSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<{
  errors: EntityAttributesValidationErrors<TBuilder>;
  values: DraftSchemaEntity<TBuilder>["attributes"];
}> {
  return pipe(
    O.fromNullable(builder.entities[entity.type]?.attributes),
    O.map((attributes) =>
      pipe(
        R.toEntries(attributes),
        A.map(([attributeName, attributeDefinition]) =>
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
            E.map((eitherResult) =>
              Ei.match(eitherResult, {
                onLeft: (error) => [attributeName, Ei.left(error)] as const,
                onRight: (value) => [attributeName, Ei.right(value)] as const,
              }),
            ),
          ),
        ),
        E.all,
        E.map((results) =>
          pipe(
            A.partitionMap(results, ([attributeName, either]) =>
              Ei.match(either, {
                onLeft: (error) => Ei.left([attributeName, error] as const),
                onRight: (value) => Ei.right([attributeName, value] as const),
              }),
            ),
            ([errors, values]) => ({
              errors: R.fromEntries(
                errors,
              ) as EntityAttributesValidationErrors<TBuilder>,
              values: R.fromEntries(values),
            }),
          ),
        ),
      ),
    ),
    O.getOrElse(() =>
      E.succeed({
        errors: {} as EntityAttributesValidationErrors<TBuilder>,
        values: {},
      }),
    ),
  );
}

export function validateEntitiesAttributes<TBuilder extends Builder>(
  schema: DraftSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<{
  entities: DraftSchema["entities"];
  attributeErrors: EntitiesAttributesValidationErrors<TBuilder>;
}> {
  return pipe(
    R.toEntries(schema.entities),
    A.map(([entityId, entity]) =>
      pipe(
        validateEntityAttributes(entityId, entity, schema, builder),
        E.map((result) => [entityId, result, entity] as const),
      ),
    ),
    E.all,
    E.map((entityResults) =>
      pipe(entityResults, (results) => ({
        entities: pipe(
          results,
          A.map(
            ([entityId, result, entity]) =>
              [entityId, { ...entity, attributes: result.values }] as const,
          ),
          R.fromEntries,
        ),
        attributeErrors: pipe(
          A.filterMap(results, ([entityId, result]) =>
            R.isEmptyRecord(result.errors as Record<string, unknown>)
              ? O.none()
              : O.some([entityId, result.errors] as const),
          ),
          R.fromEntries,
          (errors) =>
            filterEmptyRecords(
              errors,
            ) as EntitiesAttributesValidationErrors<TBuilder>,
        ),
      })),
    ),
  );
}

export function refineSchema<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<ParsedSchema<TBuilder>, SchemaRefineError<TBuilder>> {
  return pipe(
    E.promise(() => Promise.resolve(builder.refineSchema(schema))),
    E.flatMap((result) =>
      result.success
        ? E.succeed(result.value as ParsedSchema<TBuilder>)
        : E.fail(
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
): E.Effect<
  ParsedSchema<TBuilder>,
  | SchemaParseError<TBuilder>
  | EntitiesAttributesValidationError<TBuilder>
  | SchemaRefineError<TBuilder>
> {
  return pipe(
    parseSchemaWithOptions(input, builder, {
      parseMissingAttributes: true,
    }),
    E.mapErrorCause(C.map((e) => new SchemaParseError({ cause: e }))),
    E.flatMap((schema) =>
      pipe(
        validateEntitiesAttributes(schema, builder),
        E.flatMap((result) =>
          pipe(
            E.if(R.isEmptyRecord(result.attributeErrors), {
              onTrue: () => E.succeed(result.entities),
              onFalse: () =>
                E.fail(
                  new EntitiesAttributesValidationError({
                    errors: result.attributeErrors,
                  }),
                ),
            }),
          ),
        ),
        E.flatMap((entities) => refineSchema({ ...schema, entities }, builder)),
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
