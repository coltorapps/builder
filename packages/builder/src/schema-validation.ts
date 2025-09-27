import * as A from "effect/Array";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as O from "effect/Option";
import * as R from "effect/Record";

import {
  AttributeDefinition,
  InferAttributeDefinitionError,
} from "./attribute-definition";
import { Builder, InferBuilderSchemaRefineError } from "./builder";
import {
  DraftSchema,
  DraftSchemaEntity,
  ParsedSchema,
  parseEntityAttribute,
  ParseSchemaError,
  parseSchemaWithOptions,
} from "./schema-parsing";
import { KeyofStringIntersection, Result, runPromiseAsResult } from "./utils";

export type EntityAttributesErrors<
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

declare const entitiesAttributesErrorsBrand: unique symbol;

export type RawEntitiesAttributesErrors<TBuilder extends Builder = Builder> =
  R.ReadonlyRecord<
    string,
    {
      readonly [K in KeyofStringIntersection<
        TBuilder["entities"]
      >]: EntityAttributesErrors<TBuilder, K>;
    }[KeyofStringIntersection<TBuilder["entities"]>]
  >;

export type EntitiesAttributesErrors<TBuilder extends Builder = Builder> =
  RawEntitiesAttributesErrors<TBuilder> & {
    [entitiesAttributesErrorsBrand]: TBuilder;
  };

export class EntityAttributeValidationError extends D.TaggedError(
  "EntityAttributeValidationError",
)<{
  readonly entityId: string;
  readonly entityType: string;
  readonly attributeName: string;
  readonly cause: unknown;
}> {}

export class EntityAttributesValidationError extends D.TaggedError(
  "EntityAttributesValidationError",
)<{
  readonly errors: EntityAttributesErrors;
}> {}

export class EntitiesAttributesValidationError extends D.TaggedError(
  "EntitiesAttributesValidationError",
)<{
  readonly errors: RawEntitiesAttributesErrors;
}> {}

export class SchemaRefineError<
  TBuilder extends Builder = Builder,
> extends D.TaggedError("SchemaRefineError")<{
  readonly cause: InferBuilderSchemaRefineError<TBuilder>;
}> {}

type SchemaValidationResult<TBuilder extends Builder = Builder> = Result<
  ParsedSchema<TBuilder>,
  | EntitiesAttributesValidationError
  | SchemaRefineError<TBuilder>
  | ParseSchemaError
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
          builder.entityOverrides?.[entity.type]?.attributes?.[
            attributeName
          ]?.refine?.bind(
            builder.entityOverrides?.[entity.type]?.attributes?.[attributeName],
          ),
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
                    ]?.refine?.bind(
                      builder.entities[entity.type]?.attributeOverrides?.[
                        attributeName
                      ],
                    ),
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

export function validateEntityAttributes(
  entityId: string,
  entity: DraftSchemaEntity,
  schema: DraftSchema,
  builder: Builder,
): E.Effect<{
  errors: EntityAttributesErrors;
  values: DraftSchemaEntity["attributes"];
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
              errors: R.fromEntries(errors),
              values: R.fromEntries(values),
            }),
          ),
        ),
      ),
    ),
    O.getOrElse(() => E.succeed({ errors: {}, values: {} })),
  );
}

export function cleanEntitiesAttributeErrors<TBuilder extends Builder>(
  entitiesAttributeErrors: RawEntitiesAttributesErrors<TBuilder>,
): RawEntitiesAttributesErrors<TBuilder> {
  return pipe(
    entitiesAttributeErrors,
    R.filter((entityErrors) => !R.isEmptyRecord(entityErrors)),
  );
}

export function validateEntitiesAttributes<TBuilder extends Builder>(
  schema: DraftSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<{
  entities: DraftSchema["entities"];
  attributeErrors: RawEntitiesAttributesErrors;
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
          results,
          A.filterMap(([entityId, result]) =>
            R.isEmptyRecord(result.errors)
              ? O.none()
              : O.some([entityId, result.errors] as const),
          ),
          R.fromEntries,
          cleanEntitiesAttributeErrors,
        ),
      })),
    ),
  );
}

export function refineSchema<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<ParsedSchema<TBuilder>, SchemaRefineError> {
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
  ParseSchemaError | EntitiesAttributesValidationError | SchemaRefineError
> {
  return pipe(
    parseSchemaWithOptions(input, builder, {
      parseMissingAttributes: true,
    }),
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
