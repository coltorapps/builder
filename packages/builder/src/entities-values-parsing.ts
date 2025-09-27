import * as A from "effect/Array";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as O from "effect/Option";
import * as P from "effect/ParseResult";
import * as R from "effect/Record";
import * as S from "effect/Schema";

import { Builder, getEntityDefinitionDangerously } from "./builder";
import {
  EntityDefinition,
  InferEntityDefinitionParsedValue,
} from "./entity-definition";
import {
  ParsedSchema,
  parseSchemaEffectfully,
  ParseSchemaError,
  ReferencedEntityNotFoundError,
} from "./schema-parsing";
import { Result, runSyncAsResult } from "./utils";

export class EntityValueNotAllowedError extends D.TaggedError(
  "EntityValueNotAllowedError",
)<{
  readonly entityId: string;
  readonly entityType: string;
}> {}

export class EntityUnprocessableError extends D.TaggedError(
  "EntityUnprocessableError",
)<{
  readonly entityId: string;
}> {}

export class EntitiesValuesStructuralError extends D.TaggedError(
  "EntitiesValuesStructuralError",
)<{
  readonly issues: P.ArrayFormatterIssue[];
  readonly cause: P.ParseError;
}> {}

export type EntitiesValuesParseErrors = Record<string, unknown>;

export class EntitiesValuesParseError extends D.TaggedError(
  "EntitiesValuesParseError",
)<{
  readonly errors: EntitiesValuesParseErrors;
}> {}

type ParseEntityValueError =
  | EntityValueNotAllowedError
  | ReferencedEntityNotFoundError
  | EntityUnprocessableError;

function parseEntityValue(
  entityId: string,
  entityType: string,
  entityValue: unknown,
  entityDef: EntityDefinition,
  entitiesValues: Record<string, unknown>,
  schema: ParsedSchema,
  builder: Builder,
): E.Effect<Ei.Either<unknown, unknown>, ParseEntityValueError> {
  return pipe(
    R.get(schema.entities, entityId),
    O.map((entity) =>
      pipe(
        E.fail(new EntityValueNotAllowedError({ entityId, entityType })),
        E.unless(() => entityDef.valueAllowed),
        E.flatMap(() => E.fail(new EntityUnprocessableError({ entityId }))),
        E.unless(() =>
          pipe(
            {
              entity: {
                id: entityId,
                type: entityType,
                attributes: pipe(
                  R.toEntries(entity.attributes),
                  A.map(
                    ([attributeName, attributeValue]) =>
                      [
                        attributeName,
                        {
                          metadata:
                            entityDef.attributes[attributeName]?.metadata,
                          name: attributeName,
                          value: attributeValue,
                        },
                      ] as const,
                  ),
                  R.fromEntries,
                ),
                parentId: entity.parentId,
                children: entity.children,
                metadata: entityDef.metadata,
              },
              schema,
              entities: pipe(
                R.toEntries(schema.entities),
                A.map(
                  ([id, ent]) =>
                    [
                      id,
                      {
                        id,
                        type: ent.type,
                        attributes: pipe(
                          R.toEntries(ent.attributes),
                          A.map(
                            ([key, val]) =>
                              [
                                key,
                                {
                                  metadata:
                                    builder.entities[ent.type]?.attributes?.[
                                      key
                                    ]?.metadata,
                                  name: key,
                                  value: val,
                                },
                              ] as const,
                          ),
                          R.fromEntries,
                        ),
                        parentId: ent.parentId,
                        children: ent.children,
                        metadata: builder.entities[ent.type]?.metadata,
                        value: entitiesValues[id],
                      },
                    ] as const,
                ),
                R.fromEntries,
              ),
            },
            (baseContext) =>
              pipe(
                O.fromNullable(
                  builder.entityOverrides?.[entityType]?.shouldBeProcessed,
                ),
                O.map((override) =>
                  override({
                    ...baseContext,
                    shouldBeProcessed: () =>
                      entityDef.shouldBeProcessed(baseContext),
                  }),
                ),
                O.getOrElse(() => entityDef.shouldBeProcessed(baseContext)),
              ),
          ),
        ),
        E.map(() =>
          pipe(
            entityDef.parse(entityValue, {
              entity: {
                id: entityId,
                type: entityType,
                attributes: pipe(
                  R.toEntries(entity.attributes),
                  A.map(
                    ([key, val]) =>
                      [
                        key,
                        {
                          metadata: entityDef.attributes[key]?.metadata,
                          name: key,
                          value: val,
                        },
                      ] as const,
                  ),
                  R.fromEntries,
                ),
                parentId: entity.parentId,
                children: entity.children,
                metadata: entityDef.metadata,
              },
              schema,
            }),
            (result) =>
              !result.success ? Ei.left(result.error) : Ei.right(result.value),
          ),
        ),
      ),
    ),
    O.getOrElse(() => E.fail(new ReferencedEntityNotFoundError({ entityId }))),
  );
}

export function parseAndPartitionEntitiesValues<TBuilder extends Builder>(
  entitiesValues: Record<string, unknown>,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<
  {
    errors: EntitiesValuesParseErrors;
    values: Record<
      string,
      InferEntityDefinitionParsedValue<
        TBuilder["entities"][keyof TBuilder["entities"]]
      >
    >;
  },
  ParseEntityValueError | ReferencedEntityNotFoundError
> {
  return pipe(
    R.keys(entitiesValues),
    A.findFirst((entityId) => !R.has(schema.entities, entityId)),
    O.map((entityId) =>
      E.fail(
        new ReferencedEntityNotFoundError({
          entityId,
        }),
      ),
    ),
    O.getOrElse(() =>
      pipe(
        R.toEntries(schema.entities),
        A.filterMap(([entityId, entity]) =>
          pipe(
            R.get(entitiesValues, entityId),
            O.map((value) => [entityId, entity, value] as const),
          ),
        ),
        A.map(([entityId, entity, value]) =>
          pipe(
            getEntityDefinitionDangerously(entity.type, builder),
            (entityDefinition) =>
              parseEntityValue(
                entityId,
                entity.type,
                value,
                entityDefinition,
                entitiesValues,
                schema,
                builder,
              ),
            E.map((either) => [entityId, either] as const),
          ),
        ),
        E.all,
        E.map((results) =>
          pipe(
            A.partitionMap(results, ([entityId, either]) =>
              Ei.isLeft(either)
                ? Ei.left([entityId, either.left] as const)
                : Ei.right([entityId, either.right] as const),
            ),
            ([errors, successes]) => ({
              errors: R.fromEntries(errors),
              values: R.fromEntries(successes),
            }),
          ),
        ),
      ),
    ),
  );
}

type ParseEntitiesValuesError =
  | EntitiesValuesStructuralError
  | EntitiesValuesParseError
  | ParseSchemaError
  | ParseEntityValueError;

export function parseEntitiesValuesEffectfully<TBuilder extends Builder>(
  entitiesValues: unknown,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<
  Record<
    string,
    InferEntityDefinitionParsedValue<
      TBuilder["entities"][keyof TBuilder["entities"]]
    >
  >,
  ParseEntitiesValuesError
> {
  return pipe(
    parseSchemaEffectfully(schema, builder),
    E.flatMap((parsedSchema) =>
      pipe(
        entitiesValues,
        S.decodeUnknown(
          S.Record({
            key: S.String,
            value: S.Unknown,
          }).annotations({
            identifier: "EntitiesValues",
          }),
          {
            onExcessProperty: "error",
            errors: "all",
          },
        ),
        E.flatMap((values) =>
          parseAndPartitionEntitiesValues(values, parsedSchema, builder),
        ),
        E.flatMap(({ errors, values }) =>
          pipe(
            E.fail(new EntitiesValuesParseError({ errors })),
            E.unless(() => R.isEmptyRecord(errors)),
            E.map(() => values),
          ),
        ),
        E.catchTag(
          "ParseError",
          (error): E.Effect<never, EntitiesValuesStructuralError> =>
            E.fail(
              new EntitiesValuesStructuralError({
                issues: P.ArrayFormatter.formatErrorSync(error),
                cause: error,
              }),
            ),
        ),
      ),
    ),
  );
}

export function parseEntitiesValues<TBuilder extends Builder>(
  entitiesValues: unknown,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): Result<
  Record<
    string,
    InferEntityDefinitionParsedValue<
      TBuilder["entities"][keyof TBuilder["entities"]]
    >
  >,
  ParseEntitiesValuesError
> {
  return runSyncAsResult(
    parseEntitiesValuesEffectfully(entitiesValues, schema, builder),
  );
}
