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
import { type AST } from "effect/SchemaAST";

import { type AttributeParsedValue } from "./attribute";
import { type Builder } from "./builder";
import { asResult, type Result } from "./utils";

export interface ParsedEntity<
  TBuilder extends Builder = Builder,
  TType extends string = string,
> {
  readonly type: TType;
  readonly attributes?:
    | {
        readonly [K2 in keyof TBuilder["entities"][TType]["attributes"]]?: AttributeParsedValue<
          TBuilder["entities"][TType]["attributes"][K2]
        >;
      }
    | undefined;
  readonly parentId?: Readonly<string> | undefined;
  readonly children?: ReadonlyArray<string> | undefined;
}

export interface ParsedSchema<TBuilder extends Builder = Builder> {
  readonly entities: ReadonlyRecord<
    string,
    {
      [K in keyof TBuilder["entities"] & string]: ParsedEntity<TBuilder, K>;
    }[keyof TBuilder["entities"] & string]
  >;
  readonly root: ReadonlyArray<string>;
}

export class SchemaParseError extends Data.TaggedError("SchemaParseError")<{
  readonly issues: ParseResult.ArrayFormatterIssue[];
  readonly cause: ParseResult.ParseError;
}> {}

type SchemaParseResult<TBuilder extends Builder = Builder> = Result<
  ParsedSchema<TBuilder>,
  SchemaParseError
>;

interface SchemaParseOptions {
  parseUndefinedAttributes?: boolean;
}

function makeAttributeIssue(ast: AST, raw: unknown, key: string, msg: string) {
  return new ParseResult.Pointer(
    ["attributes", key],
    raw,
    new ParseResult.Type(ast, raw, msg),
  );
}

export class InvalidEntityTypeError extends Data.TaggedError("InvalidEntityTypeError")<{
  readonly entityType: string;
  readonly validEntityTypes: ReadonlyArray<string>;
}> {}

export class ParentNotFoundError extends Data.TaggedError("ParentNotFoundError")<{
  readonly parentId: string;
}> {}

export class ParentRequiredError extends Data.TaggedError("ParentRequiredError")<{
  readonly entityType: string;
}> {}

export class InvalidAttributeNameError extends Data.TaggedError(
  "InvalidAttributeNameError",
)<{
  readonly entityType: string;
  readonly attributeName: string;
  readonly validAttributeNames: ReadonlyArray<string>;
}> {}

export class InvalidEntityIdError extends Data.TaggedError("InvalidEntityIdError")<{
  readonly entityId: string;
}> {}

export class ChildNotAllowedError extends Data.TaggedError("ChildNotAllowedError")<{
  readonly entityType: string;
  readonly allowedChildren: ReadonlyArray<string>;
}> {}

export class ParentNotAllowedError extends Data.TaggedError("ParentNotAllowedError")<{
  readonly entityType: string;
  readonly allowedParents: ReadonlyArray<string>;
}> {}

export class AttributeParseError extends Data.TaggedError(
  "AttributeParseError",
)<{
  readonly entityType: string;
  readonly attributeName: string;
  readonly error: string;
}> {}

export function validateEntityId<TBuilder extends Builder>(
  entityId: string,
  builder: TBuilder,
): Effect.Effect<void, InvalidEntityIdError> {
  return builder.validateEntityId(entityId)
    ? Effect.void
    : Effect.fail(new InvalidEntityIdError({ entityId }));
}

export function validateEntityAttributeNames<TBuilder extends Builder>(
  entityType: string,
  attributes: Record<string, unknown> | undefined,
  builder: TBuilder,
): Effect.Effect<void, InvalidAttributeNameError> {
  return pipe(
    Option.fromNullable(attributes),
    Option.flatMap((attributeValues) =>
      pipe(
        Option.fromNullable(builder.entities[entityType]?.attributes),
        Option.flatMap((attributeDefinitions) =>
          pipe(
            Record.toEntries(attributeValues),
            Array.findFirst(([key]) => !Record.has(attributeDefinitions, key)),
            Option.map(([badKey]) =>
              Effect.fail(
                new InvalidAttributeNameError({
                  entityType,
                  attributeName: badKey,
                  validAttributeNames: Record.keys(attributeDefinitions),
                }),
              ),
            ),
          ),
        ),
      ),
    ),
    Option.getOrElse(() => Effect.void),
  );
}

export function validateParentRequired<TBuilder extends Builder>(
  entityType: string,
  parentId: string | undefined,
  builder: TBuilder,
): Effect.Effect<void, ParentRequiredError> {
  return pipe(
    Option.fromNullable(
      builder.entityOverrides?.[entityType]?.parentRequired ??
        builder.entities[entityType]?.parentRequired,
    ),
    Option.map((parentRequired) =>
      parentRequired && !parentId
        ? Effect.fail(new ParentRequiredError({ entityType }))
        : Effect.void,
    ),
    Option.getOrElse(() => Effect.void),
  );
}

export function validateParentId<TBuilder extends Builder>(
  parentId: string,
  entities: ParsedSchema<TBuilder>["entities"],
): Effect.Effect<void, ParentNotFoundError> {
  return Record.has(entities, parentId)
    ? Effect.void
    : Effect.fail(new ParentNotFoundError({ parentId }));
}

export function validateEntityType<TBuilder extends Builder>(
  entityType: string,
  builder: TBuilder,
): Effect.Effect<void, InvalidEntityTypeError> {
  return Record.has(builder.entities, entityType)
    ? Effect.void
    : Effect.fail(
        new InvalidEntityTypeError({
          entityType,
          validEntityTypes: Record.keys(builder.entities),
        }),
      );
}

export function validateEntityChildren<TBuilder extends Builder>(
  parentEntityType: string,
  childEntityType: string,
  builder: TBuilder,
): Effect.Effect<void, ChildNotAllowedError> {
  return pipe(
    Match.value(
      builder.entityOverrides?.[parentEntityType]?.childrenAllowed ??
        builder.entities[parentEntityType]?.childrenAllowed,
    ),
    Match.when(Match.boolean, (childrenAllowed) =>
      !childrenAllowed
        ? Effect.fail(
            new ChildNotAllowedError({
              entityType: parentEntityType,
              allowedChildren: [],
            }),
          )
        : Effect.void,
    ),
    Match.when(Match.defined, (allowedChildren) =>
      Array.contains(allowedChildren, childEntityType)
        ? Effect.void
        : Effect.fail(
            new ChildNotAllowedError({
              entityType: parentEntityType,
              allowedChildren,
            }),
          ),
    ),
    Match.orElse(() => Effect.void),
  );
}

export function validateEntityParent<TBuilder extends Builder>(
  entityType: string,
  parentEntityType: string,
  builder: TBuilder,
): Effect.Effect<void, ParentNotAllowedError> {
  return pipe(
    Match.value(
      builder.entityOverrides?.[entityType]?.parentAllowed ??
        builder.entities[entityType]?.parentAllowed,
    ),
    Match.when(Match.boolean, (parentAllowed) =>
      !parentAllowed
        ? Effect.fail(
            new ParentNotAllowedError({
              entityType,
              allowedParents: [],
            }),
          )
        : Effect.void,
    ),
    Match.when(Match.defined, (allowedParents) =>
      Array.contains(allowedParents, parentEntityType)
        ? Effect.void
        : Effect.fail(
            new ParentNotAllowedError({
              entityType,
              allowedParents,
            }),
          ),
    ),
    Match.orElse(() => Effect.void),
  );
}

export function parseEntityAttributes<TBuilder extends Builder>(
  entityType: string,
  attributes: Record<string, unknown> | undefined,
  builder: TBuilder,
  options?: { parseUndefinedAttributes?: boolean },
): Effect.Effect<ParsedEntity<TBuilder>["attributes"], AttributeParseError> {
  return pipe(
    options?.parseUndefinedAttributes === true
      ? Option.some(attributes ?? {})
      : Option.fromNullable(attributes),
    Option.map((attrs) =>
      pipe(
        Option.fromNullable(builder.entities[entityType]?.attributes),
        Option.map((attributeDefinitions) =>
          pipe(
            Record.toEntries(attributeDefinitions),
            Array.filter(
              ([key]) =>
                attrs[key] !== undefined ||
                options?.parseUndefinedAttributes === true,
            ),
            Array.partitionMap(([key, def]) =>
              pipe(
                def.validate[0](attrs[key], {
                  attribute: { metadata: def.metadata, name: key },
                }),
                (r) =>
                  r.success
                    ? Either.right([key, r.value] as const)
                    : Either.left(
                        new AttributeParseError({
                          entityType,
                          attributeName: key,
                          error: JSON.stringify(r.error),
                        }),
                      ),
              ),
            ),
            ([errors, parsedPairs]) =>
              pipe(
                errors,
                Array.match({
                  onEmpty: () =>
                    Effect.succeed(
                      Array.match(parsedPairs, {
                        onNonEmpty: (pairs) => Record.fromEntries(pairs),
                        onEmpty: () =>
                          options?.parseUndefinedAttributes === true
                            ? {}
                            : undefined,
                      }),
                    ),
                  onNonEmpty: (errs) => Effect.fail(errs[0]), // Return first error
                }),
              ),
          ),
        ),
        Option.getOrElse(() => Effect.succeed(undefined)),
      ),
    ),
    Option.getOrElse(() => Effect.succeed(undefined)),
  );
}

interface ValidateEntityContext<TBuilder extends Builder = Builder> {
  entityId: string;
  entityType: string;
  attributes?: Record<string, unknown> | undefined;
  parentId?: string | undefined;
  entities: ParsedSchema<TBuilder>["entities"];
}

export function parseEntity<TBuilder extends Builder>(
  context: ValidateEntityContext<TBuilder>,
  builder: TBuilder,
): Effect.Effect<
  void,
  | InvalidEntityIdError
  | InvalidEntityTypeError
  | ParentRequiredError
  | InvalidAttributeNameError
  | ParentNotFoundError
  | ChildNotAllowedError
  | ParentNotAllowedError
> {
  return Effect.all([
    validateEntityId(context.entityId, builder),
    validateEntityType(context.entityType, builder),
    validateParentRequired(context.entityType, context.parentId, builder),
    validateEntityAttributeNames(
      context.entityType,
      context.attributes,
      builder,
    ),
    pipe(
      Option.fromNullable(context.parentId),
      Option.map((parentId) => validateParentId(parentId, context.entities)),
      Option.getOrElse(() => Effect.void),
    ),
    pipe(
      Option.fromNullable(context.parentId),
      Option.map((parentId) =>
        pipe(
          Option.fromNullable(context.entities[parentId]),
          Option.map((parentEntity) =>
            Effect.all([
              validateEntityChildren(
                parentEntity.type,
                context.entityType,
                builder,
              ),
              validateEntityParent(
                context.entityType,
                parentEntity.type,
                builder,
              ),
            ]),
          ),
          Option.getOrElse(() => Effect.fail(new ParentNotFoundError({ parentId }))),
        ),
      ),
      Option.getOrElse(() => Effect.void),
    ),
  ]);
}

function makeEntityParseSchema<TBuilder extends Builder>(
  builder: TBuilder,
  options?: SchemaParseOptions,
) {
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
            Effect.match({
              onSuccess: (parsedAttributes) =>
                ParseResult.succeed({
                  ...entity,
                  attributes: parsedAttributes,
                }),
              onFailure: (error) =>
                ParseResult.fail(
                  makeAttributeIssue(
                    ast,
                    entity.attributes?.[error.attributeName],
                    error.attributeName,
                    error.error,
                  ),
                ),
            }),
            Effect.runSync,
          ),
        encode: (entity) => ParseResult.succeed(entity),
      }),
  );
}

function makeEntitiesParseSchema<TBuilder extends Builder>(
  builder: TBuilder,
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
            parseEntity(
              {
                entityId,
                entityType: entity.type,
                attributes: entity.attributes,
                parentId: entity.parentId,
                entities,
              },
              builder,
            ),
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
            Match.when(Match.instanceOf(ParentNotFoundError), () => ({
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

function makeParseSchema<TBuilder extends Builder>(
  builder: TBuilder,
  options?: SchemaParseOptions,
) {
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

export function parseSchemaEffectfully<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
  options?: SchemaParseOptions,
): Effect.Effect<ParsedSchema<TBuilder>, SchemaParseError> {
  return pipe(
    Schema.decodeUnknown(makeParseSchema(builder, options), {
      onExcessProperty: "error",
      errors: "all",
    })(input) as Effect.Effect<ParsedSchema<TBuilder>, ParseResult.ParseError>,
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

export function parseSchema<TBuilder extends Builder>(
  input: unknown,
  builder: TBuilder,
): SchemaParseResult<TBuilder> {
  return Effect.runSync(asResult(parseSchemaEffectfully(input, builder)));
}
