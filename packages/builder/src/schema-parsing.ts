import {
  Array,
  Data,
  Effect,
  Either,
  Match,
  Option,
  ParseResult,
  pipe,
  Record,
  Schema,
} from "effect";
import { type ReadonlyRecord } from "effect/Record";

import {
  type AttributeDefinition,
  type InferAttributeDefinitionParsedValue,
} from "./attribute-definition";
import { type Builder } from "./builder";
import { type EntityDefinition } from "./entity-definition";
import {
  runSyncAsResult,
  type KeyofStringIntersection,
  type Result,
} from "./utils";

export interface DraftSchemaEntity<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> {
  readonly type: TType;
  readonly attributes?:
    | {
        readonly [K2 in keyof TBuilder["entities"][TType]["attributes"]]?: InferAttributeDefinitionParsedValue<
          TBuilder["entities"][TType]["attributes"][K2]
        >;
      }
    | undefined;
  readonly parentId?: Readonly<string> | undefined;
  readonly children?: ReadonlyArray<string> | undefined;
}

export interface DraftSchemaEntityWithId<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> extends DraftSchemaEntity<TBuilder, TType> {
  readonly id: string;
}

export interface DraftSchema<TBuilder extends Builder = Builder> {
  readonly entities: ReadonlyRecord<
    string,
    {
      [K in KeyofStringIntersection<TBuilder["entities"]>]: DraftSchemaEntity<
        TBuilder,
        K
      >;
    }[KeyofStringIntersection<TBuilder["entities"]>]
  >;
  readonly root: ReadonlyArray<string>;
}

export type EntityAttributeParseErrors = Record<string, unknown>;

export class SchemaParseError extends Data.TaggedError("SchemaParseError")<{
  readonly issues: ParseResult.ArrayFormatterIssue[];
  readonly cause: ParseResult.ParseError;
}> {}

type SchemaParseResult<TBuilder extends Builder = Builder> = Result<
  DraftSchema<TBuilder>,
  SchemaParseError
>;

interface SchemaParseOptions {
  parseMissingAttributes?: boolean;
}

export class InvalidEntityTypeError extends Data.TaggedError(
  "InvalidEntityTypeError",
)<{
  readonly entityType: string;
  readonly validEntityTypes: ReadonlyArray<string>;
}> {}

export class EntityNotFoundError extends Data.TaggedError(
  "EntityNotFoundError",
)<{
  readonly entityId: string;
}> {}

export class ParentRequiredError extends Data.TaggedError(
  "ParentRequiredError",
)<{
  readonly entityType: string;
}> {}

export class InvalidAttributeNameError extends Data.TaggedError(
  "InvalidAttributeNameError",
)<{
  readonly entityType: string;
  readonly attributeName: string;
  readonly validAttributeNames: ReadonlyArray<string>;
}> {}

export class InvalidEntityIdError extends Data.TaggedError(
  "InvalidEntityIdError",
)<{
  readonly entityId: string;
}> {}

export class ChildNotAllowedError extends Data.TaggedError(
  "ChildNotAllowedError",
)<{
  readonly entityType: string;
  readonly allowedChildren: ReadonlyArray<string>;
}> {}

export class ParentNotAllowedError extends Data.TaggedError(
  "ParentNotAllowedError",
)<{
  readonly entityType: string;
  readonly allowedParents: ReadonlyArray<string>;
}> {}

export class EntityAttributeParseError extends Data.TaggedError(
  "EntityAttributeParseError",
)<{
  readonly entityId: string;
  readonly entityType: string;
  readonly attributeName: string;
  readonly cause: unknown;
}> {}

export class EntityAttributesParseError extends Data.TaggedError(
  "EntityAttributesParseError",
)<{
  readonly errors: EntityAttributeParseErrors;
}> {}

export function validateEntityId(
  entityId: string,
  builder: Builder,
): Effect.Effect<void, InvalidEntityIdError> {
  return Effect.if(builder.validateEntityId(entityId), {
    onTrue: () => Effect.void,
    onFalse: () => Effect.fail(new InvalidEntityIdError({ entityId })),
  });
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
): Effect.Effect<void, InvalidAttributeNameError> {
  return pipe(
    Option.fromNullable(builder.entities[entityType]?.attributes),
    Option.flatMap((attributeDefinitions) =>
      Record.has(attributeDefinitions, attributeName)
        ? Option.none()
        : Option.some(
            Effect.fail(
              new InvalidAttributeNameError({
                entityType,
                attributeName,
                validAttributeNames: Record.keys(attributeDefinitions),
              }),
            ),
          ),
    ),
    Option.getOrElse(() => Effect.void),
  );
}

export function validateEntityAttributeNames(
  entityType: string,
  attributeNames: Array<string>,
  builder: Builder,
): Effect.Effect<void, InvalidAttributeNameError> {
  return Effect.all(
    Array.map(attributeNames, (attributeName) =>
      validateEntityAttributeName(entityType, attributeName, builder),
    ),
  );
}

export function validateParentRequiredness(
  entityType: string,
  parentId: string | undefined,
  builder: Builder,
): Effect.Effect<void, ParentRequiredError> {
  return pipe(
    Option.fromNullable(
      builder.entityOverrides?.[entityType]?.parentRequired ??
        builder.entities[entityType]?.parentRequired,
    ),
    Option.map((parentRequired) =>
      Effect.if(parentRequired && !parentId, {
        onTrue: () => Effect.fail(new ParentRequiredError({ entityType })),
        onFalse: () => Effect.void,
      }),
    ),
    Option.getOrElse(() => Effect.void),
  );
}

export function validateEntityIdExistance(
  entityId: string,
  entities: DraftSchema["entities"],
): Effect.Effect<void, EntityNotFoundError> {
  return Effect.if(Record.has(entities, entityId), {
    onTrue: () => Effect.void,
    onFalse: () => Effect.fail(new EntityNotFoundError({ entityId })),
  });
}

export function getDraftSchemaEntity(
  entityId: string,
  entities: DraftSchema["entities"],
): Effect.Effect<DraftSchemaEntity, EntityNotFoundError> {
  return pipe(
    Record.get(entities, entityId),
    Option.map((entity) => Effect.succeed(entity)),
    Option.getOrElse(() => Effect.fail(new EntityNotFoundError({ entityId }))),
  );
}

export function getAttributeDefinition(
  entityType: string,
  entityDefinition: EntityDefinition,
  attributeName: string,
): Effect.Effect<AttributeDefinition, InvalidAttributeNameError> {
  return pipe(
    Record.get(entityDefinition.attributes, attributeName),
    Option.map((attributeDefinition) => Effect.succeed(attributeDefinition)),
    Option.getOrElse(() =>
      Effect.fail(
        new InvalidAttributeNameError({
          entityType,
          attributeName,
          validAttributeNames: Record.keys(entityDefinition.attributes),
        }),
      ),
    ),
  );
}

export function validateEntityType(
  entityType: string,
  builder: Builder,
): Effect.Effect<void, InvalidEntityTypeError> {
  return Effect.if(Record.has(builder.entities, entityType), {
    onTrue: () => Effect.void,
    onFalse: () =>
      Effect.fail(
        new InvalidEntityTypeError({
          entityType,
          validEntityTypes: Record.keys(builder.entities),
        }),
      ),
  });
}

export function validateEntityChildrenAllowance(
  parentEntityType: string,
  childEntityType: string,
  builder: Builder,
): Effect.Effect<void, ChildNotAllowedError> {
  return pipe(
    Match.value(
      builder.entityOverrides?.[parentEntityType]?.childrenAllowed ??
        builder.entities[parentEntityType]?.childrenAllowed,
    ),
    Match.when(Match.boolean, (childrenAllowed) =>
      Effect.if(!childrenAllowed, {
        onTrue: () =>
          Effect.fail(
            new ChildNotAllowedError({
              entityType: parentEntityType,
              allowedChildren: [],
            }),
          ),
        onFalse: () => Effect.void,
      }),
    ),
    Match.when(Match.defined, (allowedChildren) =>
      Effect.if(Array.contains(allowedChildren, childEntityType), {
        onTrue: () => Effect.void,
        onFalse: () =>
          Effect.fail(
            new ChildNotAllowedError({
              entityType: parentEntityType,
              allowedChildren,
            }),
          ),
      }),
    ),
    Match.orElse(() => Effect.void),
  );
}

export function validateEntityParentAllowance(
  entityType: string,
  parentEntityType: string,
  builder: Builder,
): Effect.Effect<void, ParentNotAllowedError> {
  return pipe(
    Match.value(
      builder.entityOverrides?.[entityType]?.parentAllowed ??
        builder.entities[entityType]?.parentAllowed,
    ),
    Match.when(Match.boolean, (parentAllowed) =>
      Effect.if(!parentAllowed, {
        onTrue: () =>
          Effect.fail(
            new ParentNotAllowedError({
              entityType,
              allowedParents: [],
            }),
          ),
        onFalse: () => Effect.void,
      }),
    ),
    Match.when(Match.defined, (allowedParents) =>
      Effect.if(Array.contains(allowedParents, parentEntityType), {
        onTrue: () => Effect.void,
        onFalse: () =>
          Effect.fail(
            new ParentNotAllowedError({
              entityType,
              allowedParents,
            }),
          ),
      }),
    ),
    Match.orElse(() => Effect.void),
  );
}

export function cleanDraftSchemaEntity<
  TBuilder extends Builder,
  TType extends KeyofStringIntersection<TBuilder["entities"]>,
>(
  entity: DraftSchemaEntity<TBuilder, TType>,
): DraftSchemaEntity<TBuilder, TType> {
  return {
    type: entity.type,
    ...(entity.parentId !== undefined ? { parentId: entity.parentId } : {}),
    ...(entity.children !== undefined ? { children: entity.children } : {}),
    ...(entity.attributes && !Record.isEmptyRecord(entity.attributes)
      ? {
          attributes: entity.attributes,
        }
      : {}),
  };
}

export function parseEntityAttribute(
  attributeName: string,
  attributeValue: unknown,
  attributeDefinition: AttributeDefinition,
): Either.Either<unknown, unknown> {
  return pipe(
    attributeDefinition.parse(attributeValue, {
      attribute: {
        metadata: attributeDefinition.metadata,
        name: attributeName,
      },
    }),
    (result) =>
      !result.success ? Either.left(result.error) : Either.right(result.value),
  );
}

export function computeEntityAttributesWithDefaults(
  attributes: DraftSchemaEntity["attributes"],
  entityType: string,
  builder: Builder,
): DraftSchemaEntity["attributes"] {
  return pipe(
    Option.fromNullable(builder.entities[entityType]?.attributes),
    Option.map((attributeDefinitions) =>
      pipe(
        Record.toEntries(attributeDefinitions),
        Array.filterMap(([key, attributeDefinition]) =>
          !Record.has(attributes ?? {}, key)
            ? pipe(
                Option.fromNullable(
                  attributeDefinition.defaultValue?.bind(attributeDefinition),
                ),
                Option.map(
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
            : Option.none(),
        ),
        Record.fromEntries,
        (defaultValues) => ({ ...attributes, ...defaultValues }),
      ),
    ),
    Option.getOrElse(() => attributes),
  );
}

export function parseEntityAttributes(
  entityType: string,
  attributes: Record<string, unknown> | undefined,
  builder: Builder,
  options?: SchemaParseOptions,
): {
  errors: EntityAttributeParseErrors;
  values: DraftSchemaEntity["attributes"];
} {
  return pipe(
    Option.fromNullable(
      computeEntityAttributesWithDefaults(
        attributes ??
          (options?.parseMissingAttributes === true ? {} : undefined),
        entityType,
        builder,
      ),
    ),
    Option.map((attrs) =>
      pipe(
        Option.fromNullable(builder.entities[entityType]?.attributes),
        Option.map((attributeDefinitions) =>
          pipe(
            Record.toEntries(attributeDefinitions),
            Array.filter(
              ([key]) =>
                key in attrs || options?.parseMissingAttributes === true,
            ),
            Array.partitionMap(([key, attributeDefinition]) =>
              pipe(
                parseEntityAttribute(key, attrs[key], attributeDefinition),
                Either.match({
                  onLeft: (error) => Either.left([key, error] as const),
                  onRight: (value) => Either.right([key, value] as const),
                }),
              ),
            ),
            ([errors, successes]) => ({
              errors: Record.fromEntries(errors),
              values: Record.fromEntries(successes),
            }),
          ),
        ),
        Option.getOrElse(() => ({ errors: {}, values: {} })),
      ),
    ),
    Option.getOrElse(() => ({ errors: {}, values: {} })),
  );
}

interface ValidateEntityContext {
  entityType: string;
  attributes?: Record<string, unknown> | undefined;
  parentId?: string | undefined;
  entities: DraftSchema["entities"];
}

export type EntityConstraintError =
  | InvalidEntityTypeError
  | ParentRequiredError
  | InvalidAttributeNameError
  | EntityNotFoundError
  | ChildNotAllowedError
  | ParentNotAllowedError;

export function validateEntityConstraints(
  context: ValidateEntityContext,
  builder: Builder,
): Effect.Effect<void, EntityConstraintError> {
  return Effect.all([
    validateEntityType(context.entityType, builder),
    validateParentRequiredness(context.entityType, context.parentId, builder),
    validateEntityAttributeNames(
      context.entityType,
      Record.keys(context.attributes ?? {}),
      builder,
    ),
    pipe(
      Option.fromNullable(context.parentId),
      Option.map((parentId) =>
        validateEntityIdExistance(parentId, context.entities),
      ),
      Option.getOrElse(() => Effect.void),
    ),
    pipe(
      Option.fromNullable(context.parentId),
      Option.map((parentId) =>
        pipe(
          getDraftSchemaEntity(parentId, context.entities),
          Effect.flatMap((parentEntity) =>
            Effect.all([
              validateEntityChildrenAllowance(
                parentEntity.type,
                context.entityType,
                builder,
              ),
              validateEntityParentAllowance(
                context.entityType,
                parentEntity.type,
                builder,
              ),
            ]),
          ),
        ),
      ),
      Option.getOrElse(() => Effect.void),
    ),
  ]);
}

function makeEntityParseSchema(builder: Builder, options?: SchemaParseOptions) {
  return pipe(
    Schema.Struct({
      type: pipe(
        Schema.String,
        Schema.filter((type) =>
          pipe(
            validateEntityType(type, builder),
            Effect.match({
              onSuccess: () => true,
              onFailure: (error) =>
                Array.match(error.validEntityTypes, {
                  onEmpty: () => `Expected no entities, actual: ${type}`,
                  onNonEmpty: (keys) =>
                    `Expected ${keys.join(" | ")}, actual: ${type}`,
                }),
            }),
            Effect.runSync,
          ),
        ),
      ),
      attributes: Schema.optional(
        Schema.Record({
          key: Schema.String,
          value: Schema.Unknown,
        }).annotations({
          identifier: "Attributes",
        }),
      ),
      parentId: Schema.optional(Schema.String),
      children: Schema.optional(Schema.Array(Schema.String)),
    }),

    (entitySchema) =>
      Schema.transformOrFail(entitySchema, entitySchema, {
        decode: (entity, _, ast) =>
          pipe(
            parseEntityAttributes(
              entity.type,
              entity.attributes,
              builder,
              options,
            ),
            ({ errors, values }) =>
              pipe(
                errors,
                Record.toEntries,
                Array.map(
                  ([attributeName, error]) =>
                    new ParseResult.Pointer(
                      ["attributes", attributeName],
                      entity.attributes?.[attributeName],
                      new ParseResult.Type(
                        ast,
                        entity.attributes?.[attributeName],
                        JSON.stringify(error),
                      ),
                    ),
                ),
                (issues) =>
                  Array.isNonEmptyArray(issues)
                    ? ParseResult.fail(
                        new ParseResult.Composite(ast, entity, issues),
                      )
                    : ParseResult.succeed(
                        cleanDraftSchemaEntity({
                          ...entity,
                          attributes: values,
                        }),
                      ),
              ),
          ),
        encode: (entity) => ParseResult.succeed(entity),
      }),
  );
}

function makeEntitiesParseSchema(
  builder: Builder,
  options?: SchemaParseOptions,
) {
  return pipe(
    Schema.Record({
      key: Schema.String,
      value: makeEntityParseSchema(builder, options),
    }).annotations({
      identifier: "Entities",
    }),

    Schema.filter((entities) =>
      pipe(
        Record.toEntries(entities),
        Array.findFirst(([entityId, entity]) =>
          pipe(
            Effect.all([
              validateEntityId(entityId, builder),
              validateEntityConstraints(
                {
                  entityType: entity.type,
                  attributes: entity.attributes,
                  parentId: entity.parentId,
                  entities,
                },
                builder,
              ),
            ]),
            Effect.match({
              onSuccess: () => Option.none(),
              onFailure: (error) => Option.some({ entityId, error }),
            }),
            Effect.runSync,
          ),
        ),
        Option.map(({ entityId, error }) =>
          pipe(
            Match.value(error),
            Match.when(Match.instanceOf(InvalidEntityIdError), () => ({
              message: "Invalid entity ID",
              path: [entityId],
            })),
            Match.when(Match.instanceOf(InvalidEntityTypeError), (err) => ({
              message: Array.match(err.validEntityTypes, {
                onEmpty: () =>
                  `Expected no entities, actual: ${err.entityType}`,
                onNonEmpty: (keys) =>
                  `Expected ${keys.join(" | ")}, actual: ${err.entityType}`,
              }),
              path: [entityId, "type"],
            })),
            Match.when(Match.instanceOf(ParentRequiredError), () => ({
              message: "Entity requires a parent but has none",
              path: [entityId, "parentId"],
            })),
            Match.when(Match.instanceOf(InvalidAttributeNameError), (err) => ({
              message: Array.match(err.validAttributeNames, {
                onEmpty: () =>
                  `Expected no attributes, actual: ${err.attributeName}`,
                onNonEmpty: (keys) =>
                  `Expected ${keys.join(" | ")}, actual: ${err.attributeName}`,
              }),
              path: [entityId, "attributes", err.attributeName],
            })),
            Match.when(Match.instanceOf(EntityNotFoundError), () => ({
              message: "Invalid ID reference",
              path: [entityId, "parentId"],
            })),
            Match.when(Match.instanceOf(ChildNotAllowedError), (err) => ({
              message: Array.match(err.allowedChildren, {
                onEmpty: () => "Entity children are not allowed",
                onNonEmpty: (children) =>
                  `Entity children must be of type ${children.join(" | ")}`,
              }),
              path: [entityId, "children"],
            })),
            Match.when(Match.instanceOf(ParentNotAllowedError), (err) => ({
              message: Array.match(err.allowedParents, {
                onEmpty: () => "Entity parent is not allowed",
                onNonEmpty: (parents) =>
                  `Entity parent must be of type ${parents.join(" | ")}`,
              }),
              path: [entityId, "parentId"],
            })),
            Match.orElse(() => ({
              message: "Unknown validation error",
              path: [entityId],
            })),
          ),
        ),
        Option.getOrElse(() => true),
      ),
    ),

    Schema.filter((entities) =>
      pipe(
        Record.toEntries(entities),
        Array.findFirst(([_id, entity]) =>
          pipe(
            Option.fromNullable(entity.children),
            Option.filter(
              (children) => Array.dedupe(children).length !== children.length,
            ),
            Option.isSome,
          ),
        ),
        Option.map(([id]) => ({
          message: "Duplicate children IDs",
          path: [id, "children"],
        })),
        Option.getOrElse(() => true),
      ),
    ),
    Schema.filter((entities) =>
      pipe(
        Record.toEntries(entities),
        Array.findFirst(([id, entity]) =>
          pipe(
            Option.fromNullable(entity.children),
            Option.flatMap((children) =>
              pipe(
                children,
                Array.findFirstIndex(
                  (childId) => !Record.has(entities, childId),
                ),
                Option.map((index) => ({ id, index })),
              ),
            ),
          ),
        ),
        Option.map((item) => ({
          message: "Invalid ID reference",
          path: [item.id, "children", item.index],
        })),
        Option.getOrElse(() => true),
      ),
    ),
    Schema.filter((entities) =>
      pipe(
        Record.toEntries(entities),
        Array.findFirst(([id, e]) => e.parentId === id),
        Option.map(([id]) => ({
          message: "Entity cannot be its own parent",
          path: [id, "parentId"],
        })),
        Option.getOrElse(() => true),
      ),
    ),
    Schema.filter((entities) =>
      pipe(
        Record.toEntries(entities),
        Array.findFirst(([id, e]) =>
          pipe(
            Option.fromNullable(e.children),
            Option.exists((children) => Array.contains(children, id)),
          ),
        ),
        Option.map(([id]) => ({
          message: "Entity cannot list itself in children",
          path: [id, "children"],
        })),
        Option.getOrElse(() => true),
      ),
    ),
    Schema.filter((entities) =>
      pipe(
        Record.toEntries(entities),
        Array.findFirst(([parentId, parentEntity]) =>
          pipe(
            Option.fromNullable(parentEntity.children),
            Option.flatMap((children) =>
              pipe(
                children,
                Array.findFirstIndex(
                  (childId) => entities[childId]?.parentId !== parentId,
                ),
                Option.map((index) => ({ parentId, index })),
              ),
            ),
          ),
        ),
        Option.map((item) => ({
          message: "Relationship not mirrored in remote parentId",
          path: [item.parentId, "children", item.index],
        })),
        Option.getOrElse(() => true),
      ),
    ),
    Schema.filter((entities) =>
      pipe(
        Record.toEntries(entities),
        Array.findFirst(([childId, childEntity]) =>
          pipe(
            Option.fromNullable(childEntity.parentId),
            Option.filter(
              (parentId) =>
                !entities[parentId]?.children ||
                !Array.contains(entities[parentId]?.children, childId),
            ),
            Option.map(() => childId),
          ),
        ),
        Option.map((childId) => ({
          message: "Relationship not mirrored in remote children",
          path: [childId, "parentId"],
        })),
        Option.getOrElse(() => true),
      ),
    ),
  );
}

function makeParseDraftSchema(builder: Builder, options?: SchemaParseOptions) {
  return pipe(
    pipe(
      Schema.Struct({
        entities: makeEntitiesParseSchema(builder, options),
        root: pipe(
          Schema.Array(Schema.String).annotations({
            identifier: "Root",
          }),
          Schema.filter(
            (ids) => Array.dedupe(ids).length === ids.length || "Duplicate IDs",
          ),
        ),
      }).annotations({
        title: "Schema",
      }),
      Schema.filter((data) =>
        pipe(
          Array.findFirstIndex(
            data.root,
            (id) => !Record.has(data.entities, id),
          ),
          Option.map((index) => ({
            message: "Invalid ID reference",
            path: ["root", index],
          })),
          Option.getOrElse(() => true),
        ),
      ),
      Schema.filter(
        (data) =>
          Array.length(data.root) > 0 ||
          Record.keys(data.entities).length === 0 || {
            message:
              "At least one root ID must be specified if any entities exist",
            path: ["root"],
          },
      ),
      Schema.filter((data) =>
        pipe(
          Array.findFirst(data.root, (id) =>
            Option.isSome(Option.fromNullable(data.entities[id]?.parentId)),
          ),
          Option.map((id) => ({
            message: "Root entity cannot have a parent",
            path: ["entities", id, "parentId"],
          })),
          Option.getOrElse(() => true),
        ),
      ),
      Schema.filter((data) =>
        pipe(
          Record.toEntries(data.entities),
          Array.findFirst(
            ([id, e]) =>
              Option.isNone(Option.fromNullable(e.parentId)) &&
              !Array.contains(data.root, id),
          ),
          Option.map(([id]) => ({
            message: "Entity without parent must appear in root",
            path: ["entities", id, "parentId"],
          })),
          Option.getOrElse(() => true),
        ),
      ),
    ),
  );
}

export function parseDraftSchemaWithOptions(
  input: unknown,
  builder: Builder,
  options?: SchemaParseOptions,
): Effect.Effect<DraftSchema, SchemaParseError> {
  return pipe(
    Schema.decodeUnknown(makeParseDraftSchema(builder, options), {
      onExcessProperty: "error",
      errors: "all",
    })(input),
    Effect.catchAll(
      (error): Effect.Effect<never, SchemaParseError> =>
        Effect.fail(
          new SchemaParseError({
            issues: ParseResult.ArrayFormatter.formatErrorSync(error),
            cause: error,
          }),
        ),
    ),
  );
}

export function parseDraftSchemaEffectfully<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): Effect.Effect<DraftSchema<TBuilder>, SchemaParseError> {
  return parseDraftSchemaWithOptions(input, builder);
}

export function parseDraftSchema<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): SchemaParseResult<TBuilder> {
  return runSyncAsResult(parseDraftSchemaEffectfully(input, builder));
}
