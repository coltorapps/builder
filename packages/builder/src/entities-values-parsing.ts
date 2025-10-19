import * as A from "effect/Array";
import * as C from "effect/Cause";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as HM from "effect/HashMap";
import * as HS from "effect/HashSet";
import * as O from "effect/Option";
import * as P from "effect/ParseResult";
import * as R from "effect/Record";
import * as S from "effect/Schema";

import {
  getEntityDefinitionDangerously,
  type Builder,
  type BuilderBrand,
} from "./builder";
import {
  type EntityDefinitionRefineContext,
  type InferEntityDefinitionParsedValue,
  type InferEntityDefinitionParseError,
} from "./entity-definition";
import {
  collectEntityDescendants,
  getSchemaEntityById,
  parseSchemaEffectfully,
  SchemaParseError,
  validateSchemaEntityIdExists,
  type ParsedSchema,
  type ReferencedEntityNotFoundError,
} from "./schema-parsing";
import {
  createEntityRef,
  runSyncAsResult,
  type EntityRef,
  type KeyofStringIntersection,
  type Result,
} from "./utils";

type RawEntitiesValues<TBuilder extends Builder> = Record<
  string,
  InferEntityDefinitionParsedValue<
    TBuilder["entities"][keyof TBuilder["entities"]]
  >
>;

export type DraftEntitiesValues<TBuilder extends Builder> =
  RawEntitiesValues<TBuilder> & BuilderBrand<TBuilder, "DraftEntitiesValues">;

export type ParsedEntitiesValues<TBuilder extends Builder> =
  RawEntitiesValues<TBuilder> & BuilderBrand<TBuilder, "ParsedEntitiesValues">;

export class EntityValueNotAllowedError<
  TBuilder extends Builder = Builder,
> extends D.TaggedError("EntityValueNotAllowedError")<{
  readonly entityRef: EntityRef<TBuilder>;
}> {}

export class EntityUnprocessableError<
  TBuilder extends Builder = Builder,
> extends D.TaggedError("EntityUnprocessableError")<{
  readonly entityRef: EntityRef<TBuilder>;
  readonly sourceEntityRef: EntityRef<TBuilder>;
}> {}

export class EntitiesValuesStructuralError extends D.TaggedError(
  "EntitiesValuesStructuralError",
)<{
  readonly issues: P.ArrayFormatterIssue[];
  readonly cause: P.ParseError;
}> {}

export type EntitiesValuesParseErrors<TBuilder extends Builder> = Record<
  string,
  InferEntityDefinitionParseError<
    TBuilder["entities"][KeyofStringIntersection<TBuilder["entities"]>]
  >
> &
  BuilderBrand<TBuilder, "EntitiesValuesParseErrors">;

export class EntityValueParseError<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> extends D.TaggedError("EntityValueParseError")<{
  readonly entityRef: EntityRef<TBuilder>;
  readonly cause: InferEntityDefinitionParseError<TBuilder["entities"][TType]>;
}> {}

export class EntitiesValuesParseError<
  TBuilder extends Builder,
> extends D.TaggedError("EntitiesValuesParseError")<{
  readonly errors: EntitiesValuesParseErrors<TBuilder>;
}> {}

export type UnprocessableEntities = HM.HashMap<string, { sourceId: string }>;

export type ParseEntityValueError<TBuilder extends Builder = Builder> =
  | EntityValueNotAllowedError<TBuilder>
  | ReferencedEntityNotFoundError
  | EntityUnprocessableError<TBuilder>;

function parseEntityValue<TBuilder extends Builder>(
  entityId: string,
  entityType: string,
  entityValue: unknown,
  entityDef: TBuilder["entities"][KeyofStringIntersection<
    TBuilder["entities"]
  >],
  schema: ParsedSchema<TBuilder>,
): E.Effect<Ei.Either<unknown, unknown>, ParseEntityValueError<TBuilder>> {
  return pipe(
    getSchemaEntityById(entityId, schema.entities),
    E.flatMap((entity) =>
      pipe(
        E.fail(
          new EntityValueNotAllowedError({
            entityRef: createEntityRef(entityType, entityId),
          }),
        ),
        E.unless(() => entityDef.valueAllowed),
        E.map(() =>
          pipe(
            R.toEntries(entity.attributes),
            A.map((entry) =>
              pipe(
                entry,
                ([attributeName, attributeValue]) =>
                  [
                    attributeName,
                    {
                      metadata: entityDef.attributes[attributeName]?.metadata,
                      name: attributeName,
                      value: attributeValue,
                    },
                  ] as const,
              ),
            ),
            R.fromEntries,
            (attributes) =>
              entityDef.parse(entityValue, {
                entity: {
                  id: entityId,
                  type: entity.type,
                  attributes,
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
  );
}

export function computeUnprocessableEntities<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
  entitiesValues: Record<string, unknown>,
): E.Effect<UnprocessableEntities, ReferencedEntityNotFoundError> {
  return pipe(
    R.toEntries(schema.entities),
    A.filterMap(([id, schemaEntity]) =>
      pipe(
        R.get(builder.entities, schemaEntity.type),
        O.map((builderEntityDefinition) =>
          pipe(
            R.toEntries(schemaEntity.attributes),
            A.map((entry) =>
              pipe(
                entry,
                ([attributeName, attributeValue]) =>
                  [
                    attributeName,
                    {
                      metadata:
                        builderEntityDefinition.attributes?.[attributeName]
                          ?.metadata,
                      name: attributeName,
                      value: attributeValue,
                    },
                  ] as const,
              ),
            ),
            R.fromEntries,
            (attributes) =>
              [
                id,
                {
                  id,
                  type: schemaEntity.type,
                  attributes,
                  parentId: schemaEntity.parentId,
                  children: schemaEntity.children,
                  metadata: builderEntityDefinition.metadata,
                  value: entitiesValues[id],
                },
              ] as const,
          ),
        ),
      ),
    ),
    R.fromEntries,
    (entitiesRecord) =>
      pipe(
        R.toEntries(schema.entities),
        E.reduce(
          {
            unprocessable: HM.empty<string, { sourceId: string }>(),
            checked: HS.empty<string>(),
          },
          (acc, [entityId, entity]) =>
            pipe(
              E.if(HS.has(acc.checked, entityId), {
                onTrue: () => E.succeed(acc),
                onFalse: () =>
                  pipe(
                    getEntityDefinitionDangerously(entity.type, builder),
                    (entityDef) =>
                      pipe(
                        O.fromNullable(
                          builder.entityOverrides?.[entity.type]
                            ?.shouldBeProcessed,
                        ),
                        O.map(
                          (overrideFn) =>
                            (ctx: EntityDefinitionRefineContext) =>
                              overrideFn({
                                ...ctx,
                                shouldBeProcessed: () =>
                                  entityDef.shouldBeProcessed(ctx),
                              }),
                        ),
                        O.getOrElse(
                          () => (ctx: EntityDefinitionRefineContext) =>
                            entityDef.shouldBeProcessed(ctx),
                        ),
                        (shouldBeProcessedFn) =>
                          shouldBeProcessedFn({
                            entity: pipe(
                              R.get(entitiesRecord, entityId),
                              O.getOrThrow,
                            ),
                            schema,
                            entities: entitiesRecord,
                          }),
                        (isProcessable) =>
                          E.if(!isProcessable, {
                            onTrue: () =>
                              pipe(
                                collectEntityDescendants(entityId, schema),
                                E.map((descendants) =>
                                  pipe(
                                    descendants,
                                    A.reduce(
                                      {
                                        unprocessable: HM.set(
                                          acc.unprocessable,
                                          entityId,
                                          { sourceId: entityId },
                                        ),
                                        checked: HS.add(acc.checked, entityId),
                                      },
                                      (innerAcc, descendantId) => ({
                                        unprocessable: HM.set(
                                          innerAcc.unprocessable,
                                          descendantId,
                                          { sourceId: entityId },
                                        ),
                                        checked: HS.add(
                                          innerAcc.checked,
                                          descendantId,
                                        ),
                                      }),
                                    ),
                                  ),
                                ),
                              ),
                            onFalse: () =>
                              E.succeed({
                                unprocessable: acc.unprocessable,
                                checked: HS.add(acc.checked, entityId),
                              }),
                          }),
                      ),
                  ),
              }),
            ),
        ),
        E.map((result) => result.unprocessable),
      ),
  );
}

function validateEntityIdProcessable(
  entityId: string,
  entityType: string,
  unprocessableEntities: UnprocessableEntities,
  schema: ParsedSchema,
): E.Effect<void, EntityUnprocessableError | ReferencedEntityNotFoundError> {
  return pipe(
    HM.get(unprocessableEntities, entityId),
    O.map(({ sourceId }) =>
      pipe(
        getSchemaEntityById(sourceId, schema.entities),
        E.flatMap((sourceEntity) =>
          E.fail(
            new EntityUnprocessableError({
              entityRef: createEntityRef(entityType, entityId),
              sourceEntityRef: createEntityRef(sourceEntity.type, sourceId),
            }),
          ),
        ),
      ),
    ),
    O.getOrElse(() => E.void),
  );
}

export function parseAndPartitionEntitiesValues<
  TBuilder extends Builder,
  TOptions extends ParseEntitiesValuesOptions,
>(
  entitiesValues: Record<string, unknown>,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
  options?: TOptions,
): E.Effect<
  {
    errors: EntitiesValuesParseErrors<TBuilder>;
    values: TOptions["parseMissingValues"] extends true
      ? ParsedEntitiesValues<TBuilder>
      : DraftEntitiesValues<TBuilder>;
  },
  ParseEntityValueError<TBuilder>
> {
  return pipe(
    R.keys(entitiesValues),
    E.forEach((entityId) =>
      validateSchemaEntityIdExists(entityId, schema.entities),
    ),
    E.flatMap(() =>
      pipe(
        R.toEntries(schema.entities),
        A.filterMap(([entityId, entity]) =>
          R.has(entitiesValues, entityId) ||
          (options?.parseMissingValues === true &&
            getEntityDefinitionDangerously(entity.type, builder).valueAllowed)
            ? O.some([entityId, entity, entitiesValues[entityId]] as const)
            : O.none(),
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
                schema,
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
              errors: R.fromEntries(
                errors,
              ) as EntitiesValuesParseErrors<TBuilder>,
              values: R.fromEntries(
                successes,
              ) as TOptions["parseMissingValues"] extends true
                ? ParsedEntitiesValues<TBuilder>
                : DraftEntitiesValues<TBuilder>,
            }),
          ),
        ),
      ),
    ),
  );
}

export type ParseEntitiesValuesError<TBuilder extends Builder> =
  | EntitiesValuesStructuralError
  | EntitiesValuesParseError<TBuilder>
  | SchemaParseError<TBuilder>
  | ParseEntityValueError<TBuilder>;

type ParseEntitiesValuesOptions = {
  parseMissingValues?: boolean;
};

export function parseEntitiesValuesWithOptions<
  TBuilder extends Builder,
  TOptions extends ParseEntitiesValuesOptions,
>(
  entitiesValues: unknown,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
  options?: TOptions,
): E.Effect<
  TOptions["parseMissingValues"] extends true
    ? ParsedEntitiesValues<TBuilder>
    : DraftEntitiesValues<TBuilder>,
  ParseEntitiesValuesError<TBuilder>
> {
  return pipe(
    parseSchemaEffectfully(schema, builder),
    E.mapErrorCause(C.map((e) => new SchemaParseError({ cause: e }))),
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
        E.flatMap((values) =>
          parseAndPartitionEntitiesValues(
            values,
            parsedSchema,
            builder,
            options,
          ),
        ),
        E.flatMap(({ errors, values }) =>
          pipe(
            E.fail(new EntitiesValuesParseError({ errors })),
            E.unless(() => R.isEmptyRecord(errors)),
            E.flatMap(() =>
              computeUnprocessableEntities(parsedSchema, builder, values),
            ),
            E.map((unprocessableEntities) => ({
              values,
              unprocessableEntities,
            })),
          ),
        ),
        E.flatMap(({ values, unprocessableEntities }) =>
          pipe(
            R.keys(values),
            E.forEach((entityId) =>
              pipe(
                getSchemaEntityById(entityId, parsedSchema.entities),
                E.tap((entity) =>
                  validateEntityIdProcessable(
                    entityId,
                    entity.type,
                    unprocessableEntities,
                    parsedSchema,
                  ),
                ),
              ),
            ),
            E.as(
              values as TOptions["parseMissingValues"] extends true
                ? ParsedEntitiesValues<TBuilder>
                : DraftEntitiesValues<TBuilder>,
            ),
          ),
        ),
      ),
    ),
  );
}

export function parseEntitiesValuesEffectfully<TBuilder extends Builder>(
  entitiesValues: unknown,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<
  ParsedEntitiesValues<TBuilder>,
  ParseEntitiesValuesError<TBuilder>
> {
  return parseEntitiesValuesWithOptions(entitiesValues, schema, builder, {
    parseMissingValues: true,
  });
}

export function parseEntitiesValues<TBuilder extends Builder>(
  entitiesValues: unknown,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): Result<ParsedEntitiesValues<TBuilder>, ParseEntitiesValuesError<TBuilder>> {
  return runSyncAsResult(
    parseEntitiesValuesEffectfully(entitiesValues, schema, builder),
  );
}

export function parseDraftEntitiesValuesEffectfully<TBuilder extends Builder>(
  entitiesValues: unknown,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<DraftEntitiesValues<TBuilder>, ParseEntitiesValuesError<TBuilder>> {
  return parseEntitiesValuesWithOptions(entitiesValues, schema, builder, {
    parseMissingValues: false,
  });
}

export function parseDraftEntitiesValues<TBuilder extends Builder>(
  entitiesValues: unknown,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): Result<DraftEntitiesValues<TBuilder>, ParseEntitiesValuesError<TBuilder>> {
  return runSyncAsResult(
    parseDraftEntitiesValuesEffectfully(entitiesValues, schema, builder),
  );
}
