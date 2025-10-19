import * as A from "effect/Array";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as O from "effect/Option";
import * as R from "effect/Record";

import {
  getEntityDefinitionDangerously,
  type Builder,
  type BuilderBrand,
} from "./builder";
import {
  EntityValueNotAllowedError,
  parseEntitiesValuesEffectfully,
  type ParsedEntitiesValues,
  type ParseEntitiesValuesError,
} from "./entities-values-parsing";
import {
  type ContextEntityInstanceWithValue,
  type EntityDefinition,
  type InferEntityDefinitionError,
} from "./entity-definition";
import {
  getSchemaEntityById,
  type ParsedSchema,
  type ReferencedEntityNotFoundError,
} from "./schema-parsing";
import {
  createEntityRef,
  runPromiseAsResult,
  type EntityRef,
  type KeyofStringIntersection,
  type Result,
} from "./utils";

export type EntitiesValuesValidationErrors<TBuilder extends Builder = Builder> =
  R.ReadonlyRecord<
    string,
    InferEntityDefinitionError<
      TBuilder["entities"][KeyofStringIntersection<TBuilder["entities"]>]
    >
  > &
    BuilderBrand<TBuilder, "EntitiesValuesValidationErrors">;

export class EntityValueValidationError<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> extends D.TaggedError("EntityValueValidationError")<{
  readonly entityRef: EntityRef<TBuilder>;
  readonly cause: InferEntityDefinitionError<TBuilder["entities"][TType]>;
}> {}

export class EntitiesValuesValidationError<
  TBuilder extends Builder,
> extends D.TaggedError("EntitiesValuesValidationError")<{
  readonly errors: EntitiesValuesValidationErrors<TBuilder>;
}> {}

type EntitiesValuesValidationResult<TBuilder extends Builder = Builder> =
  Result<
    ParsedEntitiesValues<TBuilder>,
    EntitiesValuesValidationError<TBuilder> | ParseEntitiesValuesError<TBuilder>
  >;

function makeContextEntity(
  entityId: string,
  value: unknown,
  schema: ParsedSchema,
  builder: Builder,
): E.Effect<ContextEntityInstanceWithValue, ReferencedEntityNotFoundError> {
  return pipe(
    getSchemaEntityById(entityId, schema.entities),
    E.map((entity) => ({
      entity,
      entityDefinition: getEntityDefinitionDangerously(entity.type, builder),
    })),
    E.map(({ entity, entityDefinition }) =>
      pipe(
        R.toEntries(entity.attributes),
        A.map((entry) =>
          pipe(
            entry,
            ([attributeName, attributeValue]) =>
              [
                attributeName,
                {
                  metadata:
                    entityDefinition.attributes[attributeName]?.metadata,
                  name: attributeName,
                  value: attributeValue,
                },
              ] as const,
          ),
        ),
        R.fromEntries,
        (attributes) => ({
          id: entityId,
          type: entity.type,
          attributes,
          parentId: entity.parentId,
          children: entity.children,
          metadata: entityDefinition.metadata,
          value,
        }),
      ),
    ),
  );
}

export function validateEntityValue(
  entityId: string,
  entityType: string,
  entitiesValues: ParsedEntitiesValues<Builder>,
  entityDef: EntityDefinition,
  schema: ParsedSchema,
  builder: Builder,
): E.Effect<
  Ei.Either<unknown, unknown>,
  ReferencedEntityNotFoundError | EntityValueNotAllowedError
> {
  return pipe(
    E.fail(
      new EntityValueNotAllowedError({
        entityRef: createEntityRef(entityType, entityId),
      }),
    ),
    E.unless(() => entityDef.valueAllowed),
    E.flatMap(() =>
      pipe(
        R.toEntries(entitiesValues),
        A.map(([entityId, entityValue]) =>
          pipe(
            makeContextEntity(entityId, entityValue, schema, builder),
            E.map((contextEntity) => [entityId, contextEntity] as const),
          ),
        ),
        E.all,
        E.map(R.fromEntries),
        E.flatMap((entities) =>
          pipe(
            makeContextEntity(
              entityId,
              entitiesValues[entityId],
              schema,
              builder,
            ),
            E.map((entity) => ({
              entities,
              entity,
              schema,
            })),
            E.flatMap((baseContext) =>
              pipe(
                O.fromNullable(builder.entityOverrides?.[entityType]?.refine),
                O.map(
                  (bRefine) => (val: unknown) =>
                    bRefine(val, {
                      ...baseContext,
                      refine: (innerVal) =>
                        entityDef.refine(innerVal, baseContext),
                    }),
                ),
                O.getOrElse(
                  () => (val: unknown) => entityDef.refine(val, baseContext),
                ),
                (refineFn) =>
                  pipe(
                    E.promise(() =>
                      Promise.resolve(refineFn(baseContext.entity.value)),
                    ),
                    E.map((result) =>
                      result.success
                        ? Ei.right(result.value)
                        : Ei.left(result.error),
                    ),
                  ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

export function validateAndPartitionEntitiesValues<TBuilder extends Builder>(
  entitiesValues: ParsedEntitiesValues<TBuilder>,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<
  {
    errors: EntitiesValuesValidationErrors<TBuilder>;
    values: ParsedEntitiesValues<TBuilder>;
  },
  ParseEntitiesValuesError<TBuilder>
> {
  return pipe(
    R.toEntries(entitiesValues),
    A.map(([entityId, _entityValue]) =>
      pipe(
        getSchemaEntityById(entityId, schema.entities),
        E.map((entity) => ({
          entityId,
          entity,
          entityDefinition: getEntityDefinitionDangerously(entity.type, builder),
        })),
        E.flatMap(({ entityId, entity, entityDefinition }) =>
          pipe(
            validateEntityValue(
              entityId,
              entity.type,
              entitiesValues,
              entityDefinition,
              schema,
              builder,
            ),
            E.map((result) => [entityId, result] as const),
          ),
        ),
      ),
    ),
    E.all,
    E.map((results) =>
      pipe(
        A.partitionMap(results, ([entityId, either]) =>
          Ei.match(either, {
            onLeft: (error) => Ei.left([entityId, error] as const),
            onRight: (value) => Ei.right([entityId, value] as const),
          }),
        ),
        ([validationErrors, validatedValues]) => ({
          errors: R.fromEntries(
            validationErrors,
          ) as EntitiesValuesValidationErrors<TBuilder>,
          values: R.fromEntries(
            validatedValues,
          ) as ParsedEntitiesValues<TBuilder>,
        }),
      ),
    ),
  );
}

export function validateEntitiesValuesEffectfully<TBuilder extends Builder>(
  entitiesValues: unknown,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<
  ParsedEntitiesValues<TBuilder>,
  ParseEntitiesValuesError<TBuilder> | EntitiesValuesValidationError<TBuilder>
> {
  return pipe(
    parseEntitiesValuesEffectfully(entitiesValues, schema, builder),
    E.flatMap((parsedEntitiesValues) =>
      pipe(
        validateAndPartitionEntitiesValues(
          parsedEntitiesValues,
          schema,
          builder,
        ),
        E.flatMap(({ errors, values }) =>
          pipe(
            E.fail(
              new EntitiesValuesValidationError({
                errors,
              }),
            ),
            E.unless(() => R.isEmptyRecord(errors)),
            E.as(values),
          ),
        ),
      ),
    ),
  );
}

export function validateEntitiesValues<TBuilder extends Builder>(
  entitiesValues: unknown,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): Promise<EntitiesValuesValidationResult<TBuilder>> {
  return runPromiseAsResult(
    validateEntitiesValuesEffectfully(entitiesValues, schema, builder),
  );
}
