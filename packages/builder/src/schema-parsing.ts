import * as A from "effect/Array";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as M from "effect/Match";
import * as O from "effect/Option";
import * as P from "effect/ParseResult";
import * as R from "effect/Record";
import * as S from "effect/Schema";

import {
  AttributeDefinition,
  InferAttributeDefinitionParsedValue,
} from "./attribute-definition";
import { Builder } from "./builder";
import { EntityDefinition } from "./entity-definition";
import { KeyofStringIntersection, Result, runSyncAsResult } from "./utils";

export interface DraftSchemaEntity<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> {
  readonly attributes: {
    readonly [K2 in keyof TBuilder["entities"][TType]["attributes"]]?: InferAttributeDefinitionParsedValue<
      TBuilder["entities"][TType]["attributes"][K2]
    >;
  };
  readonly type: TType;
  readonly parentId?: Readonly<string>;
  readonly children?: ReadonlyArray<string>;
}

export type DraftSchema<TBuilder extends Builder = Builder> = {
  readonly entities: R.ReadonlyRecord<
    string,
    {
      [K in KeyofStringIntersection<TBuilder["entities"]>]: DraftSchemaEntity<
        TBuilder,
        K
      >;
    }[KeyofStringIntersection<TBuilder["entities"]>]
  >;
  readonly root: ReadonlyArray<string>;
};

export interface ParsedSchemaEntity<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> extends Omit<DraftSchemaEntity<TBuilder, TType>, "attributes"> {
  readonly attributes: Required<
    DraftSchemaEntity<TBuilder, TType>["attributes"]
  >;
}

export interface ParsedSchema<TBuilder extends Builder = Builder>
  extends Omit<DraftSchema<TBuilder>, "entities"> {
  readonly entities: R.ReadonlyRecord<
    string,
    {
      [K in KeyofStringIntersection<TBuilder["entities"]>]: DraftSchemaEntity<
        TBuilder,
        K
      >;
    }[KeyofStringIntersection<TBuilder["entities"]>]
  >;
}

export type EntityAttributesParseErrors = R.ReadonlyRecord<string, unknown>;

export class SchemaStructuralError extends D.TaggedError(
  "SchemaStructuralError",
)<{
  readonly issues: P.ArrayFormatterIssue[];
  readonly cause: P.ParseError;
}> {}

export type ParseSchemaError =
  | SchemaStructuralError
  | InvalidEntityIdError
  | InvalidEntityTypeError
  | ParentRequiredError
  | InvalidAttributeNameError
  | ReferencedEntityNotFoundError
  | ChildNotAllowedError
  | ParentNotAllowedError
  | EntitiesAttributesParseError;

interface SchemaParseOptions {
  parseMissingAttributes?: boolean;
}

export class InvalidEntityTypeError extends D.TaggedError(
  "InvalidEntityTypeError",
)<{
  readonly entityType: string;
  readonly validEntityTypes: ReadonlyArray<string>;
}> {}

export class EntitiesAttributesParseError extends D.TaggedError(
  "EntitiesAttributesParseError",
)<{
  readonly errors: EntityAttributesParseErrors;
}> {}

export class ReferencedEntityNotFoundError extends D.TaggedError(
  "ReferencedEntityNotFoundError",
)<{
  readonly entityId: string;
}> {}

export class ParentRequiredError extends D.TaggedError("ParentRequiredError")<{
  readonly entityType: string;
}> {}

export class InvalidAttributeNameError extends D.TaggedError(
  "InvalidAttributeNameError",
)<{
  readonly entityType: string;
  readonly attributeName: string;
  readonly validAttributeNames: ReadonlyArray<string>;
}> {}

export class InvalidEntityIdError extends D.TaggedError(
  "InvalidEntityIdError",
)<{
  readonly entityId: string;
}> {}

export class ChildNotAllowedError extends D.TaggedError(
  "ChildNotAllowedError",
)<{
  readonly entityType: string;
  readonly allowedChildren: ReadonlyArray<string>;
}> {}

export class ParentNotAllowedError extends D.TaggedError(
  "ParentNotAllowedError",
)<{
  readonly entityType: string;
  readonly allowedParents: ReadonlyArray<string>;
}> {}

export class EntityAttributeParseError extends D.TaggedError(
  "EntityAttributeParseError",
)<{
  readonly entityId: string;
  readonly entityType: string;
  readonly attributeName: string;
  readonly cause: unknown;
}> {}

export class EntityAttributesParseError extends D.TaggedError(
  "EntityAttributesParseError",
)<{
  readonly errors: EntityAttributesParseErrors;
}> {}

export function validateEntityId(
  entityId: string,
  builder: Builder,
): E.Effect<void, InvalidEntityIdError> {
  return pipe(
    E.fail(new InvalidEntityIdError({ entityId })),
    E.when(() => !builder.validateEntityId(entityId)),
  );
}

export function validateEntityAttributeName<
  TBuilder extends Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
>(
  entityType: TType,
  attributeName: string,
  builder: TBuilder,
): E.Effect<void, InvalidAttributeNameError> {
  return pipe(
    O.fromNullable(builder.entities[entityType]?.attributes),
    O.map((attributeDefinitions) =>
      pipe(
        E.fail(
          new InvalidAttributeNameError({
            entityType,
            attributeName,
            validAttributeNames: R.keys(attributeDefinitions),
          }),
        ),
        E.when(() => !R.has(attributeDefinitions, attributeName)),
      ),
    ),
    O.getOrElse(() => E.void),
  );
}

export function validateEntityAttributeNames(
  entityType: string,
  attributeNames: Array<string>,
  builder: Builder,
): E.Effect<void, InvalidAttributeNameError> {
  return E.all(
    A.map(attributeNames, (attributeName) =>
      validateEntityAttributeName(entityType, attributeName, builder),
    ),
  );
}

export function validateParentRequired(
  entityType: string,
  parentId: string | undefined,
  builder: Builder,
): E.Effect<void, ParentRequiredError> {
  return pipe(
    O.fromNullable(
      builder.entityOverrides?.[entityType]?.parentRequired ??
        builder.entities[entityType]?.parentRequired,
    ),
    O.map((parentRequired) =>
      pipe(
        E.fail(new ParentRequiredError({ entityType })),
        E.when(() => parentRequired && !parentId),
      ),
    ),
    O.getOrElse(() => E.void),
  );
}

export function validateEntityIdExists(
  entityId: string,
  entities: DraftSchema["entities"],
): E.Effect<void, ReferencedEntityNotFoundError> {
  return pipe(
    E.fail(new ReferencedEntityNotFoundError({ entityId })),
    E.when(() => !R.has(entities, entityId)),
  );
}

export function getSchemaEntity<TBuilder extends Builder>(
  entityId: string,
  entities: DraftSchema<TBuilder>["entities"],
): E.Effect<DraftSchemaEntity<TBuilder>, ReferencedEntityNotFoundError> {
  return pipe(
    R.get(entities, entityId),
    O.map((entity) => E.succeed(entity)),
    O.getOrElse(() => E.fail(new ReferencedEntityNotFoundError({ entityId }))),
  );
}

export function getAttributeDefinition(
  entityType: string,
  entityDefinition: EntityDefinition,
  attributeName: string,
): E.Effect<AttributeDefinition, InvalidAttributeNameError> {
  return pipe(
    R.get(entityDefinition.attributes, attributeName),
    O.map((attributeDefinition) => E.succeed(attributeDefinition)),
    O.getOrElse(() =>
      E.fail(
        new InvalidAttributeNameError({
          entityType,
          attributeName,
          validAttributeNames: R.keys(entityDefinition.attributes),
        }),
      ),
    ),
  );
}

export function validateEntityType(
  entityType: string,
  builder: Builder,
): E.Effect<void, InvalidEntityTypeError> {
  return pipe(
    E.fail(
      new InvalidEntityTypeError({
        entityType,
        validEntityTypes: R.keys(builder.entities),
      }),
    ),
    E.when(() => !R.has(builder.entities, entityType)),
  );
}

export function validateEntityChildrenAllowed(
  parentEntityType: string,
  childEntityType: string,
  builder: Builder,
): E.Effect<void, ChildNotAllowedError> {
  return pipe(
    M.value(
      builder.entityOverrides?.[parentEntityType]?.childrenAllowed ??
        builder.entities[parentEntityType]?.childrenAllowed,
    ),
    M.when(M.boolean, (childrenAllowed) =>
      pipe(
        E.fail(
          new ChildNotAllowedError({
            entityType: parentEntityType,
            allowedChildren: [],
          }),
        ),
        E.when(() => !childrenAllowed),
      ),
    ),
    M.when(M.defined, (allowedChildren) =>
      pipe(
        E.fail(
          new ChildNotAllowedError({
            entityType: parentEntityType,
            allowedChildren,
          }),
        ),
        E.when(() => !A.contains(allowedChildren, childEntityType)),
      ),
    ),
    M.orElse(() => E.void),
  );
}

export function validateEntityParentAllowed(
  entityType: string,
  parentEntityType: string,
  builder: Builder,
): E.Effect<void, ParentNotAllowedError> {
  return pipe(
    M.value(
      builder.entityOverrides?.[entityType]?.parentAllowed ??
        builder.entities[entityType]?.parentAllowed,
    ),
    M.when(M.boolean, (parentAllowed) =>
      pipe(
        E.fail(
          new ParentNotAllowedError({
            entityType,
            allowedParents: [],
          }),
        ),
        E.when(() => !parentAllowed),
      ),
    ),
    M.when(M.defined, (allowedParents) =>
      pipe(
        E.fail(
          new ParentNotAllowedError({
            entityType,
            allowedParents,
          }),
        ),
        E.when(() => !A.contains(allowedParents, parentEntityType)),
      ),
    ),
    M.orElse(() => E.void),
  );
}

export function parseEntityAttribute(
  attributeName: string,
  attributeValue: unknown,
  attributeDefinition: AttributeDefinition,
): Ei.Either<unknown, unknown> {
  return pipe(
    attributeDefinition.parse(attributeValue, {
      attribute: {
        metadata: attributeDefinition.metadata,
        name: attributeName,
      },
    }),
    (result) =>
      !result.success ? Ei.left(result.error) : Ei.right(result.value),
  );
}

export function computeEntityAttributesWithDefaults(
  attributes: DraftSchemaEntity["attributes"],
  entityType: string,
  builder: Builder,
): DraftSchemaEntity["attributes"] {
  return pipe(
    O.fromNullable(builder.entities[entityType]?.attributes),
    O.map((attributeDefinitions) =>
      pipe(
        R.toEntries(attributeDefinitions),
        A.filterMap(([key, attributeDefinition]) =>
          !R.has(attributes, key)
            ? pipe(
                O.fromNullable(
                  attributeDefinition.defaultValue?.bind(attributeDefinition),
                ),
                O.map(
                  (defaultValueFn) =>
                    [
                      key,
                      defaultValueFn({
                        attribute: {
                          metadata: attributeDefinition.metadata,
                          name: key,
                        },
                      }),
                    ] as const,
                ),
              )
            : O.none(),
        ),
        R.fromEntries,
        (defaultValues) => ({ ...attributes, ...defaultValues }),
      ),
    ),
    O.getOrElse(() => attributes),
  );
}

export function parseEntityAttributes(
  entityType: string,
  attributes: Record<string, unknown>,
  builder: Builder,
  options?: SchemaParseOptions,
): {
  errors: EntityAttributesParseErrors;
  values: DraftSchemaEntity["attributes"];
} {
  return pipe(
    O.fromNullable(
      computeEntityAttributesWithDefaults(attributes, entityType, builder),
    ),
    O.map((attrs) =>
      pipe(
        O.fromNullable(builder.entities[entityType]?.attributes),
        O.map((attributeDefinitions) =>
          pipe(
            R.toEntries(attributeDefinitions),
            A.filter(
              ([key]) =>
                key in attrs || options?.parseMissingAttributes === true,
            ),
            A.partitionMap(([key, attributeDefinition]) =>
              pipe(
                parseEntityAttribute(key, attrs[key], attributeDefinition),
                Ei.match({
                  onLeft: (error) => Ei.left([key, error] as const),
                  onRight: (value) => Ei.right([key, value] as const),
                }),
              ),
            ),
            ([errors, successes]) => ({
              errors: R.fromEntries(errors),
              values: R.fromEntries(successes),
            }),
          ),
        ),
        O.getOrElse(() => ({ errors: {}, values: {} })),
      ),
    ),
    O.getOrElse(() => ({ errors: {}, values: {} })),
  );
}

export function parseEntitiesAttributes<TBuilder extends Builder>(
  schema: DraftSchema<TBuilder>,
  builder: TBuilder,
  options?: SchemaParseOptions,
): E.Effect<ParsedSchema<TBuilder>, EntitiesAttributesParseError> {
  return pipe(
    R.toEntries(schema.entities),
    A.map(([entityId, entity]) =>
      pipe(
        parseEntityAttributes(entity.type, entity.attributes, builder, options),
        ({ errors, values }) => ({
          entityId,
          errors,
          values,
          entity,
        }),
      ),
    ),
    (results) =>
      pipe(
        A.filterMap(results, ({ entityId, errors }) =>
          R.isEmptyRecord(errors)
            ? O.none()
            : O.some([entityId, errors] as const),
        ),
        R.fromEntries,
        (allErrors) =>
          R.isEmptyRecord(allErrors)
            ? pipe(
                A.map(
                  results,
                  ({ entityId, values, entity }) =>
                    [entityId, { ...entity, attributes: values }] as const,
                ),
                R.fromEntries,
                (updatedEntities) =>
                  E.succeed({
                    ...schema,
                    entities: updatedEntities,
                  } as ParsedSchema<TBuilder>),
              )
            : E.fail(new EntitiesAttributesParseError({ errors: allErrors })),
      ),
  );
}

interface ValidateEntityContext {
  entityType: string;
  attributes: Record<string, unknown>;
  parentId?: string | undefined;
  entities: DraftSchema["entities"];
}

export function validateEntityConstraints(
  context: ValidateEntityContext,
  builder: Builder,
): E.Effect<
  void,
  | InvalidEntityTypeError
  | ParentRequiredError
  | InvalidAttributeNameError
  | ReferencedEntityNotFoundError
  | ChildNotAllowedError
  | ParentNotAllowedError
> {
  return E.all([
    validateEntityType(context.entityType, builder),
    validateParentRequired(context.entityType, context.parentId, builder),
    validateEntityAttributeNames(
      context.entityType,
      R.keys(context.attributes),
      builder,
    ),
    pipe(
      O.fromNullable(context.parentId),
      O.map((parentId) => validateEntityIdExists(parentId, context.entities)),
      O.getOrElse(() => E.void),
    ),
    pipe(
      O.fromNullable(context.parentId),
      O.map((parentId) =>
        pipe(
          getSchemaEntity(parentId, context.entities),
          E.flatMap((parentEntity) =>
            E.all([
              validateEntityChildrenAllowed(
                parentEntity.type,
                context.entityType,
                builder,
              ),
              validateEntityParentAllowed(
                context.entityType,
                parentEntity.type,
                builder,
              ),
            ]),
          ),
        ),
      ),
      O.getOrElse(() => E.void),
    ),
  ]);
}

function makeEntitiesParseSchema(
  builder: Builder,
  options?: SchemaParseOptions,
) {
  return pipe(
    S.Record({
      key: S.String,
      value: S.Struct({
        type: S.String,
        attributes: S.Record({
          key: S.String,
          value: S.Unknown,
        }).annotations({
          identifier: "Attributes",
        }),
        parentId: S.optionalWith(S.String, { exact: true }),
        children: S.optionalWith(S.Array(S.String), { exact: true }),
      }),
    }).annotations({
      identifier: "Entities",
    }),
    S.filter((entities) =>
      pipe(
        R.toEntries(entities),
        A.findFirst(([_id, entity]) =>
          pipe(
            O.fromNullable(entity.children),
            O.filter(
              (children) => A.dedupe(children).length !== children.length,
            ),
            O.isSome,
          ),
        ),
        O.map(([id]) => ({
          message: "Duplicate children IDs",
          path: [id, "children"],
        })),
        O.getOrElse(() => true),
      ),
    ),
    S.filter((entities) =>
      pipe(
        R.toEntries(entities),
        A.findFirst(([id, entity]) =>
          pipe(
            O.fromNullable(entity.children),
            O.flatMap((children) =>
              pipe(
                children,
                A.findFirstIndex((childId) => !R.has(entities, childId)),
                O.map((index) => ({ id, index })),
              ),
            ),
          ),
        ),
        O.map((item) => ({
          message: "Invalid ID reference",
          path: [item.id, "children", item.index],
        })),
        O.getOrElse(() => true),
      ),
    ),
    S.filter((entities) =>
      pipe(
        R.toEntries(entities),
        A.findFirst(([id, e]) => e.parentId === id),
        O.map(([id]) => ({
          message: "Entity cannot be its own parent",
          path: [id, "parentId"],
        })),
        O.getOrElse(() => true),
      ),
    ),
    S.filter((entities) =>
      pipe(
        R.toEntries(entities),
        A.findFirst(([id, e]) =>
          pipe(
            O.fromNullable(e.children),
            O.exists((children) => A.contains(children, id)),
          ),
        ),
        O.map(([id]) => ({
          message: "Entity cannot list itself in children",
          path: [id, "children"],
        })),
        O.getOrElse(() => true),
      ),
    ),
    S.filter((entities) =>
      pipe(
        R.toEntries(entities),
        A.findFirst(([parentId, parentEntity]) =>
          pipe(
            O.fromNullable(parentEntity.children),
            O.flatMap((children) =>
              pipe(
                children,
                A.findFirstIndex(
                  (childId) => entities[childId]?.parentId !== parentId,
                ),
                O.map((index) => ({ parentId, index })),
              ),
            ),
          ),
        ),
        O.map((item) => ({
          message: "Relationship not mirrored in remote parentId",
          path: [item.parentId, "children", item.index],
        })),
        O.getOrElse(() => true),
      ),
    ),
    S.filter((entities) =>
      pipe(
        R.toEntries(entities),
        A.findFirst(([childId, childEntity]) =>
          pipe(
            O.fromNullable(childEntity.parentId),
            O.filter(
              (parentId) =>
                !entities[parentId]?.children ||
                !A.contains(entities[parentId]?.children, childId),
            ),
            O.map(() => childId),
          ),
        ),
        O.map((childId) => ({
          message: "Relationship not mirrored in remote children",
          path: [childId, "parentId"],
        })),
        O.getOrElse(() => true),
      ),
    ),
  );
}

function makeParseSchema(builder: Builder, options?: SchemaParseOptions) {
  return pipe(
    pipe(
      S.Struct({
        entities: makeEntitiesParseSchema(builder, options),
        root: pipe(
          S.Array(S.String).annotations({
            identifier: "Root",
          }),
          S.filter(
            (ids) => A.dedupe(ids).length === ids.length || "Duplicate IDs",
          ),
        ),
      }).annotations({
        title: "Schema",
      }),
      S.filter((data) =>
        pipe(
          A.findFirstIndex(data.root, (id) => !R.has(data.entities, id)),
          O.map((index) => ({
            message: "Invalid ID reference",
            path: ["root", index],
          })),
          O.getOrElse(() => true),
        ),
      ),
      S.filter(
        (data) =>
          A.length(data.root) > 0 ||
          R.keys(data.entities).length === 0 || {
            message:
              "At least one root ID must be specified if any entities exist",
            path: ["root"],
          },
      ),
      S.filter((data) =>
        pipe(
          A.findFirst(data.root, (id) =>
            O.isSome(O.fromNullable(data.entities[id]?.parentId)),
          ),
          O.map((id) => ({
            message: "Root entity cannot have a parent",
            path: ["entities", id, "parentId"],
          })),
          O.getOrElse(() => true),
        ),
      ),
      S.filter((data) =>
        pipe(
          R.toEntries(data.entities),
          A.findFirst(
            ([id, e]) =>
              O.isNone(O.fromNullable(e.parentId)) &&
              !A.contains(data.root, id),
          ),
          O.map(([id]) => ({
            message: "Entity without parent must appear in root",
            path: ["entities", id, "parentId"],
          })),
          O.getOrElse(() => true),
        ),
      ),
    ),
  );
}

export function parseSchemaWithOptions<
  TBuilder extends Builder,
  TOptions extends SchemaParseOptions,
>(
  input: unknown,
  builder: TBuilder,
  options?: TOptions,
): E.Effect<
  TOptions["parseMissingAttributes"] extends true
    ? ParsedSchema<TBuilder>
    : DraftSchema<TBuilder>,
  ParseSchemaError
> {
  return pipe(
    input,
    S.decodeUnknown(makeParseSchema(builder, options), {
      onExcessProperty: "error",
      errors: "all",
    }),
    E.flatMap((schema) =>
      pipe(
        R.toEntries(schema.entities),
        E.forEach(([entityId, entity]) =>
          E.all([
            validateEntityId(entityId, builder),
            validateEntityConstraints(
              {
                entityType: entity.type,
                attributes: entity.attributes,
                parentId: entity.parentId,
                entities: schema.entities,
              },
              builder,
            ),
          ]),
        ),
        E.flatMap(() => parseEntitiesAttributes(schema, builder, options)),
      ),
    ),
    E.catchTag(
      "ParseError",
      (error): E.Effect<never, SchemaStructuralError> =>
        E.fail(
          new SchemaStructuralError({
            issues: P.ArrayFormatter.formatErrorSync(error),
            cause: error,
          }),
        ),
    ),
  );
}

export function parseDraftSchemaEffectfully<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): E.Effect<DraftSchema<TBuilder>, ParseSchemaError> {
  return parseSchemaWithOptions(input, builder);
}

export function parseDraftSchema<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): Result<DraftSchema<TBuilder>, ParseSchemaError> {
  return runSyncAsResult(parseDraftSchemaEffectfully(input, builder));
}

export function parseSchemaEffectfully<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): E.Effect<ParsedSchema<TBuilder>, ParseSchemaError> {
  return parseSchemaWithOptions(input, builder, {
    parseMissingAttributes: true,
  });
}

export function parseSchema<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): Result<ParsedSchema<TBuilder>, ParseSchemaError> {
  return runSyncAsResult(parseSchemaEffectfully(input, builder));
}
