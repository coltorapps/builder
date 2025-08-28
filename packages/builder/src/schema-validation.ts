import * as A from "effect/Array";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as O from "effect/Option";
import * as R from "effect/Record";
import * as S from "effect/Struct";

import type * as attributeDefinition from "./attribute-definition";
import type * as builderDefinition from "./builder-definition";
import * as schemaParsing from "./schema-parsing";
import * as utils from "./utils";

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
  readonly errors: schemaParsing.EntityAttributesErrors;
}> {}

export class EntitiesAttributesValidationError extends D.TaggedError(
  "EntitiesAttributesValidationError",
)<{
  readonly errors: schemaParsing.EntitiesAttributesErrors;
}> {}

export class SchemaRefineError<
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
> extends D.TaggedError("SchemaRefineError")<{
  readonly cause: builderDefinition.InferBuilderDefinitionSchemaRefineError<TBuilder>;
}> {}

type SchemaValidationResult<
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
> = utils.Result<
  schemaParsing.ParsedSchema<TBuilder>,
  | schemaParsing.SchemaParseError
  | EntitiesAttributesValidationError
  | SchemaRefineError
>;

export function validateEntityAttribute(
  entityId: string,
  entity: schemaParsing.DraftSchemaEntity,
  attributeName: string,
  attributeValue: unknown,
  attributeDefinition: attributeDefinition.AttributeDefinition,
  schema: schemaParsing.DraftSchema,
  builder: builderDefinition.BuilderDefinition,
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
              ? schemaParsing.parseEntityAttribute(
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
  entity: schemaParsing.DraftSchemaEntity,
  schema: schemaParsing.DraftSchema,
  builder: builderDefinition.BuilderDefinition,
): E.Effect<{
  errors: schemaParsing.EntityAttributesErrors;
  values: schemaParsing.DraftSchemaEntity["attributes"];
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

export function cleanEntitiesAttributeErrors(
  entitiesAttributeErrors: schemaParsing.EntitiesAttributesErrors,
): schemaParsing.EntitiesAttributesErrors {
  return pipe(
    entitiesAttributeErrors,
    R.filter((entityErrors) => !R.isEmptyRecord(entityErrors)),
  );
}

export function validateEntitiesAttributes(
  schema: schemaParsing.DraftSchema,
  builder: builderDefinition.BuilderDefinition,
): E.Effect<{
  entities: schemaParsing.DraftSchema["entities"];
  attributeErrors: schemaParsing.EntitiesAttributesErrors;
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
              [
                entityId,
                S.evolve(entity, {
                  attributes: () => result.values,
                }),
              ] as const,
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

export function refineSchema<
  TBuilder extends builderDefinition.BuilderDefinition,
>(
  schema: schemaParsing.ParsedSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<schemaParsing.ParsedSchema<TBuilder>, SchemaRefineError> {
  return pipe(
    E.promise(() => Promise.resolve(builder.refineSchema(schema))),
    E.flatMap((result) =>
      result.success
        ? E.succeed(result.value as schemaParsing.ParsedSchema<TBuilder>)
        : E.fail(
            new SchemaRefineError({
              cause: result.error,
            }),
          ),
    ),
  );
}

export function validateSchemaEffectfully<
  TBuilder extends builderDefinition.BuilderDefinition,
>(
  input: unknown,
  builder: TBuilder,
): E.Effect<
  schemaParsing.ParsedSchema<TBuilder>,
  | schemaParsing.SchemaParseError
  | EntitiesAttributesValidationError
  | SchemaRefineError
> {
  return pipe(
    schemaParsing.parseSchemaWithOptions(input, builder, {
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
        E.flatMap((entities) =>
          refineSchema(
            S.evolve(schema, { entities: () => entities }),
            builder,
          ),
        ),
      ),
    ),
  );
}

export function validateSchema<
  TBuilder extends builderDefinition.BuilderDefinition,
>(
  input: unknown,
  builder: TBuilder,
): Promise<SchemaValidationResult<TBuilder>> {
  return utils.runPromiseAsResult(validateSchemaEffectfully(input, builder));
}
