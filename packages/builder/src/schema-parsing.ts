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
  type AttributeDefinition,
  type InferAttributeDefinitionParsedValue,
} from "./attribute-definition";
import { type Builder } from "./builder";
import { type EntityDefinition } from "./entity-definition";
import {
  createEntityRef,
  runSyncAsResult,
  type AttributeRef,
  type EntityRef,
  type KeyofStringIntersection,
  type Result,
} from "./utils";

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

export type ParseSchemaError<TBuilder extends Builder> =
  | SchemaStructuralError
  | InvalidEntityIdError
  | InvalidEntityTypeError<TBuilder>
  | ParentRequiredError<TBuilder>
  | InvalidAttributeNameError<TBuilder>
  | ReferencedEntityNotFoundError
  | ChildNotAllowedError<TBuilder>
  | ParentNotAllowedError<TBuilder>
  | EntitiesAttributesParseError;

interface SchemaParseOptions {
  parseMissingAttributes?: boolean;
}

export class InvalidEntityTypeError<
  TBuilder extends Builder = Builder,
> extends D.TaggedError("InvalidEntityTypeError")<{
  readonly entityId: string;
  readonly entityType: string;
  readonly validEntityTypes: ReadonlyArray<
    KeyofStringIntersection<TBuilder["entities"]>
  >;
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

export class EntityRefTypeMismatchError extends D.TaggedError(
  "EntityRefTypeMismatchError",
)<{
  readonly entityId: string;
  readonly entityType: string;
}> {}

export class ParentRequiredError<
  TBuilder extends Builder = Builder,
> extends D.TaggedError("ParentRequiredError")<{
  readonly entityRef: EntityRef<TBuilder>;
}> {}

export class InvalidAttributeNameError<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> extends D.TaggedError("InvalidAttributeNameError")<{
  readonly entityRef: EntityRef<TBuilder, TType>;
  readonly attributeName: string;
  readonly validAttributeNames: ReadonlyArray<
    KeyofStringIntersection<TBuilder["entities"][TType]["attributes"]>
  >;
}> {}

export class InvalidEntityIdError extends D.TaggedError(
  "InvalidEntityIdError",
)<{
  readonly entityId: string;
}> {}

export class ChildNotAllowedError<
  TBuilder extends Builder = Builder,
> extends D.TaggedError("ChildNotAllowedError")<{
  readonly entityRef: EntityRef<TBuilder>;
  readonly disallowedChildEntityType: KeyofStringIntersection<
    TBuilder["entities"]
  >;
  readonly allowedChildren: ReadonlyArray<
    KeyofStringIntersection<TBuilder["entities"]>
  >;
}> {}

export class ParentNotAllowedError<
  TBuilder extends Builder = Builder,
> extends D.TaggedError("ParentNotAllowedError")<{
  readonly entityRef: EntityRef<TBuilder>;
  readonly disallowedParentEntityType: KeyofStringIntersection<
    TBuilder["entities"]
  >;
  readonly allowedParents: ReadonlyArray<
    KeyofStringIntersection<TBuilder["entities"]>
  >;
}> {}

export class EntityAttributeParseError<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
  TAttributeName extends KeyofStringIntersection<
    TBuilder["entities"][TType]["attributes"]
  > = KeyofStringIntersection<TBuilder["entities"][TType]["attributes"]>,
> extends D.TaggedError("EntityAttributeParseError")<{
  readonly attributeRef: AttributeRef<TBuilder, TType, TAttributeName>;
  readonly cause: unknown;
}> {}

export class EntityAttributesParseError<
  TBuilder extends Builder = Builder,
> extends D.TaggedError("EntityAttributesParseError")<{
  readonly entityRef: EntityRef<TBuilder>;
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
  entityId: string,
  attributeName: string,
  builder: TBuilder,
): E.Effect<void, InvalidAttributeNameError<TBuilder, TType>> {
  return pipe(
    O.fromNullable(builder.entities[entityType]?.attributes),
    O.map((attributeDefinitions) =>
      pipe(
        E.fail(
          new InvalidAttributeNameError({
            entityRef: createEntityRef(entityType, entityId),
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

export function validateEntityAttributeNames<
  TBuilder extends Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
>(
  entityType: TType,
  entityId: string,
  attributeNames: Array<
    KeyofStringIntersection<TBuilder["entities"][TType]["attributes"]>
  >,
  builder: TBuilder,
): E.Effect<void, InvalidAttributeNameError<TBuilder, TType>> {
  return E.all(
    A.map(attributeNames, (attributeName) =>
      validateEntityAttributeName(entityType, entityId, attributeName, builder),
    ),
  );
}

export function validateParentRequired(
  entityType: string,
  entityId: string,
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
        E.fail(
          new ParentRequiredError({
            entityRef: createEntityRef(entityType, entityId),
          }),
        ),
        E.when(() => parentRequired && !parentId),
      ),
    ),
    O.getOrElse(() => E.void),
  );
}

export function validateSchemaEntityIdExists(
  entityId: string,
  entities: DraftSchema["entities"],
): E.Effect<void, ReferencedEntityNotFoundError> {
  return pipe(
    E.fail(new ReferencedEntityNotFoundError({ entityId })),
    E.when(() => !R.has(entities, entityId)),
  );
}

export function validateSchemaEntityRef(
  entityRef: EntityRef<Builder>,
  entities: DraftSchema["entities"],
): E.Effect<void, ReferencedEntityNotFoundError | EntityRefTypeMismatchError> {
  return pipe(
    getSchemaEntityByRef(entityRef, entities),
    E.map(() => E.void),
  );
}

export function getSchemaEntityById<TBuilder extends Builder>(
  entityId: string,
  entities: DraftSchema<TBuilder>["entities"],
): E.Effect<DraftSchemaEntity<TBuilder>, ReferencedEntityNotFoundError> {
  return pipe(
    R.get(entities, entityId),
    O.map((entity) => E.succeed(entity)),
    O.getOrElse(() => E.fail(new ReferencedEntityNotFoundError({ entityId }))),
  );
}

export function getSchemaEntityByRef<
  TBuilder extends Builder,
  TType extends KeyofStringIntersection<TBuilder["entities"]>,
>(
  entityRef: EntityRef<TBuilder, TType>,
  entities: DraftSchema<TBuilder>["entities"],
): E.Effect<
  DraftSchemaEntity<TBuilder, TType>,
  ReferencedEntityNotFoundError | EntityRefTypeMismatchError
> {
  return pipe(
    getSchemaEntityById(entityRef.id, entities),
    E.filterOrFail(
      (entity): entity is DraftSchemaEntity<TBuilder, TType> =>
        entity.type === entityRef.type,
      () =>
        new EntityRefTypeMismatchError({
          entityId: entityRef.id,
          entityType: entityRef.type,
        }),
    ),
  );
}

export function collectEntityDescendants(
  entityId: string,
  schema: DraftSchema,
): E.Effect<ReadonlyArray<string>, ReferencedEntityNotFoundError> {
  return pipe(
    getSchemaEntityById(entityId, schema.entities),
    E.flatMap((entity) =>
      pipe(
        O.fromNullable(entity.children),
        O.map((children) =>
          pipe(
            children,
            A.map((childId) =>
              pipe(
                collectEntityDescendants(childId, schema),
                E.map((descendants) => A.appendAll([childId], descendants)),
              ),
            ),
            E.all,
            E.map(A.flatten),
          ),
        ),
        O.getOrElse(() => E.succeed([])),
      ),
    ),
  );
}

export function getAttributeDefinition<
  TBuilder extends Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
>(
  entityType: TType,
  entityId: string,
  entityDefinition: EntityDefinition,
  attributeName: string,
): E.Effect<AttributeDefinition, InvalidAttributeNameError<TBuilder, TType>> {
  return pipe(
    R.get(entityDefinition.attributes, attributeName),
    O.map((attributeDefinition) => E.succeed(attributeDefinition)),
    O.getOrElse(() =>
      E.fail(
        new InvalidAttributeNameError({
          entityRef: createEntityRef(entityType, entityId),
          attributeName,
          validAttributeNames: R.keys(entityDefinition.attributes),
        }),
      ),
    ),
  );
}

export function validateEntityType(
  entityType: string,
  entityId: string,
  builder: Builder,
): E.Effect<void, InvalidEntityTypeError> {
  return pipe(
    E.fail(
      new InvalidEntityTypeError({
        entityId,
        entityType,
        validEntityTypes: R.keys(builder.entities),
      }),
    ),
    E.when(() => !R.has(builder.entities, entityType)),
  );
}

export function validateEntityChildrenAllowed(
  parentEntityType: string,
  parentEntityId: string,
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
            entityRef: createEntityRef(parentEntityType, parentEntityId),
            disallowedChildEntityType: childEntityType,
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
            entityRef: createEntityRef(parentEntityType, parentEntityId),
            disallowedChildEntityType: childEntityType,
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
  entityId: string,
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
            entityRef: createEntityRef(entityType, entityId),
            disallowedParentEntityType: parentEntityType,
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
            entityRef: createEntityRef(entityType, entityId),
            disallowedParentEntityType: parentEntityType,
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
                O.fromNullable(attributeDefinition.defaultValue),
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

export function parseEntityAttributes<TOptions extends SchemaParseOptions>(
  entityType: string,
  attributes: Record<string, unknown>,
  builder: Builder,
  options?: TOptions,
): {
  errors: EntityAttributesParseErrors;
  values: TOptions["parseMissingAttributes"] extends true
    ? ParsedSchemaEntity["attributes"]
    : DraftSchemaEntity["attributes"];
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

export function parseEntitiesAttributes<
  TBuilder extends Builder,
  TOptions extends SchemaParseOptions,
>(
  schema: DraftSchema<TBuilder>,
  builder: TBuilder,
  options?: TOptions,
): E.Effect<
  TOptions["parseMissingAttributes"] extends true
    ? ParsedSchema<TBuilder>
    : DraftSchema<TBuilder>,
  EntitiesAttributesParseError
> {
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
                  }),
              )
            : E.fail(new EntitiesAttributesParseError({ errors: allErrors })),
      ),
  );
}

export function validateEntityConstraints<
  TBuilder extends Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
>(
  entityType: TType,
  entityId: string,
  attributes: Record<string, unknown>,
  parentId: string | undefined,
  entities: DraftSchema<TBuilder>["entities"],
  builder: TBuilder,
): E.Effect<
  void,
  | InvalidEntityTypeError
  | ParentRequiredError
  | InvalidAttributeNameError<TBuilder, TType>
  | ReferencedEntityNotFoundError
  | ChildNotAllowedError
  | ParentNotAllowedError
> {
  return E.all([
    validateEntityType(entityType, entityId, builder),
    validateParentRequired(entityType, entityId, parentId, builder),
    validateEntityAttributeNames(
      entityType,
      entityId,
      R.keys(attributes),
      builder,
    ),
    pipe(
      O.fromNullable(parentId),
      O.map((parentId) => validateSchemaEntityIdExists(parentId, entities)),
      O.getOrElse(() => E.void),
    ),
    pipe(
      O.fromNullable(parentId),
      O.map((parentId) =>
        pipe(
          getSchemaEntityById(parentId, entities),
          E.flatMap((parentEntity) =>
            E.all([
              validateEntityChildrenAllowed(
                parentEntity.type,
                parentId,
                entityType,
                builder,
              ),
              validateEntityParentAllowed(
                entityType,
                entityId,
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

function makeEntitiesParseSchema() {
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

function makeParseSchema() {
  return pipe(
    pipe(
      S.Struct({
        entities: makeEntitiesParseSchema(),
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
  ParseSchemaError<TBuilder>
> {
  return pipe(
    input,
    S.decodeUnknown(makeParseSchema(), {
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
              entity.type,
              entityId,
              entity.attributes,
              entity.parentId,
              schema.entities,
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
): E.Effect<DraftSchema<TBuilder>, ParseSchemaError<TBuilder>> {
  return parseSchemaWithOptions(input, builder);
}

export function parseDraftSchema<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): Result<DraftSchema<TBuilder>, ParseSchemaError<TBuilder>> {
  return runSyncAsResult(parseDraftSchemaEffectfully(input, builder));
}

export function parseSchemaEffectfully<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): E.Effect<ParsedSchema<TBuilder>, ParseSchemaError<TBuilder>> {
  return parseSchemaWithOptions(input, builder, {
    parseMissingAttributes: true,
  });
}

export function parseSchema<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): Result<ParsedSchema<TBuilder>, ParseSchemaError<TBuilder>> {
  return runSyncAsResult(parseSchemaEffectfully(input, builder));
}
