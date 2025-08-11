import { Store } from "@tanstack/store";
import { Array, Data, Effect, Option, pipe, Record } from "effect";

import { type Builder } from "./builder";
import {
  parseEntity,
  parseEntityAttributes,
  parseSchemaEffectfully,
  type AttributeParseError,
  type ChildNotAllowedError,
  type InvalidAttributeNameError,
  type InvalidEntityIdError,
  type InvalidEntityTypeError,
  type ParentNotAllowedError,
  type ParentNotFoundError,
  type ParentRequiredError,
  type ParsedEntity,
  type ParsedSchema,
  type SchemaParseError,
} from "./schema-parsing";
import { type AttributeErrorsByEntityId } from "./schema-validation";
import { asResult, type Result } from "./utils";

interface BuilderStoreData<TBuilder extends Builder = Builder> {
  schema: ParsedSchema<TBuilder>;
  attributeErrors: AttributeErrorsByEntityId<TBuilder>;
}

interface AddEntityInput<TBuilder extends Builder = Builder>
  extends Omit<ParsedEntity<TBuilder>, "children"> {
  index?: number;
}

interface AddEntityMethod<TBuilder extends Builder = Builder> {
  input: [AddEntityInput<TBuilder>];
  output: ParsedEntity<TBuilder>;
  error:
    | InvalidEntityTypeError
    | ParentNotFoundError
    | ParentRequiredError
    | InvalidAttributeNameError
    | EntityIdAlreadyExistsError
    | InvalidEntityIdError
    | ChildNotAllowedError
    | ParentNotAllowedError
    | AttributeParseError;
}

interface RemoveEntityMethod {
  input: [string];
  output: { entityId: string };
  error: EntityNotFoundError;
}

interface EffectfulBuilderStore<TBuilder extends Builder = Builder> {
  /** @internal */
  _getUnsafeDataStore(): Store<BuilderStoreData<TBuilder>>;
  getData(): Effect.Effect<BuilderStoreData<TBuilder>>;
  addEntity(
    ...args: AddEntityMethod["input"]
  ): Effect.Effect<AddEntityMethod["output"], AddEntityMethod["error"]>;
  removeEntity(
    ...args: RemoveEntityMethod["input"]
  ): Effect.Effect<RemoveEntityMethod["output"], RemoveEntityMethod["error"]>;
}

interface BuilderStore<TBuilder extends Builder = Builder> {
  /** @internal */
  _getUnsafeDataStore(): Store<BuilderStoreData<TBuilder>>;
  getData(): BuilderStoreData<TBuilder>;
  addEntity(
    ...args: AddEntityMethod["input"]
  ): Result<AddEntityMethod["output"], AddEntityMethod["error"]>;
  removeEntity(
    ...args: RemoveEntityMethod["input"]
  ): Result<RemoveEntityMethod["output"], RemoveEntityMethod["error"]>;
}

interface CreateBuilderStoreOptions<TBuilder extends Builder = Builder> {
  initialData?: Partial<BuilderStoreData<TBuilder>>;
}

export class AttributeErrorsParsingError extends Data.TaggedError(
  "AttributeErrorsParsingError",
)<{
  readonly message: string;
}> {}

export class EntityNotFoundError extends Data.TaggedError(
  "EntityNotFoundError",
)<{
  readonly entityId: string;
}> {}

export class EntityIdAlreadyExistsError extends Data.TaggedError(
  "EntityIdAlreadyExistsError",
)<{
  readonly entityId: string;
}> {}

export function parseAttributeErrors<TBuilder extends Builder>(
  attributeErrors: AttributeErrorsByEntityId<TBuilder>,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): Effect.Effect<
  AttributeErrorsByEntityId<TBuilder>,
  AttributeErrorsParsingError
> {
  return pipe(
    Record.keys(attributeErrors),
    Array.findFirst((entityId) => !Record.has(schema.entities, entityId)),
    Option.map((entityId) =>
      Effect.fail(
        new AttributeErrorsParsingError({
          message: `Entity ID not found in schema: ${entityId}`,
        }),
      ),
    ),
    Option.getOrElse(() =>
      pipe(
        Array.findFirst(
          Record.toEntries(attributeErrors),
          ([entityId, entityErrors]) =>
            pipe(
              Option.fromNullable(schema.entities[entityId]),
              Option.flatMap((entity) =>
                pipe(
                  Record.keys(entityErrors ?? {}),
                  Array.findFirst(
                    (attr) =>
                      !Record.has(
                        builder.entities[entity.type]?.attributes ?? {},
                        attr,
                      ),
                  ),
                  Option.map((invalidAttr) => ({
                    entityId,
                    entityType: entity.type,
                    invalidAttr,
                  })),
                ),
              ),
            ),
        ),
        Option.map(({ entityId, entityType, invalidAttr }) =>
          Effect.fail(
            new AttributeErrorsParsingError({
              message: `Attribute '${invalidAttr}' not found on entity type '${entityType}' for entity ID '${entityId}'`,
            }),
          ),
        ),
        Option.getOrElse(() => Effect.succeed(attributeErrors)),
      ),
    ),
  );
}

export function collectEntityDescendants<TBuilder extends Builder>(
  entityId: string,
  schema: ParsedSchema<TBuilder>,
): ReadonlyArray<string> {
  return pipe(
    Option.fromNullable(schema.entities[entityId]),
    Option.flatMap((e) => Option.fromNullable(e.children)),
    Option.map((children) =>
      Array.flatMap(children, (childId) =>
        Array.appendAll([childId], collectEntityDescendants(childId, schema)),
      ),
    ),
    Option.getOrElse(() => []),
  );
}

export function removeEntity<TBuilder extends Builder>(
  entityId: string,
  store: Store<BuilderStoreData<TBuilder>>,
): Effect.Effect<{ entityId: string }, EntityNotFoundError> {
  return pipe(
    Effect.Do,
    Effect.bind("schema", () => Effect.succeed(store.state.schema)),
    Effect.bind("target", ({ schema }) =>
      pipe(
        Option.fromNullable(schema.entities[entityId]),
        Option.map((entity) => Effect.succeed(entity)),
        Option.getOrElse(() =>
          Effect.fail(new EntityNotFoundError({ entityId })),
        ),
      ),
    ),
    Effect.bind("idsToRemove", ({ schema }) =>
      Effect.succeed(
        Array.appendAll([entityId], collectEntityDescendants(entityId, schema)),
      ),
    ),
    Effect.bind("filteredEntities", ({ schema, idsToRemove }) =>
      Effect.succeed(
        Record.filter(
          schema.entities,
          (_, id) => !Array.contains(idsToRemove, id),
        ),
      ),
    ),
    Effect.bind("newEntities", ({ target, filteredEntities }) =>
      Effect.succeed(
        pipe(
          Option.fromNullable(target.parentId),
          Option.flatMap((parentId) =>
            pipe(
              Option.fromNullable(filteredEntities[parentId]),
              Option.flatMap((parent) => Option.fromNullable(parent.children)),
              Option.map((parentChildren) =>
                Record.modify(filteredEntities, parentId, (parent) => ({
                  ...parent,
                  children: Array.filter(
                    parentChildren,
                    (id) => id !== entityId,
                  ),
                })),
              ),
            ),
          ),
          Option.getOrElse(() => filteredEntities),
        ),
      ),
    ),
    Effect.bind("newSchema", ({ schema, newEntities }) =>
      Effect.succeed({
        entities: newEntities,
        root: Array.filter(schema.root, (id) => id !== entityId),
      }),
    ),
    Effect.tap(({ newSchema }) =>
      Effect.sync(() =>
        store.setState((prev) => ({
          ...prev,
          schema: newSchema,
        })),
      ),
    ),
    Effect.as({ entityId }),
  );
}

export function addEntity<TBuilder extends Builder>(
  input: AddEntityInput<TBuilder>,
  store: Store<BuilderStoreData<TBuilder>>,
  builder: TBuilder,
): Effect.Effect<
  ParsedEntity<TBuilder>,
  | InvalidEntityTypeError
  | ParentNotFoundError
  | ParentRequiredError
  | InvalidAttributeNameError
  | EntityIdAlreadyExistsError
  | InvalidEntityIdError
  | ChildNotAllowedError
  | ParentNotAllowedError
  | AttributeParseError
> {
  return pipe(
    Effect.Do,
    Effect.bind("currentSchema", () => Effect.sync(() => store.state.schema)),
    Effect.bind("entityId", () =>
      Effect.sync(() => builder.generateEntityId()),
    ),
    Effect.tap(({ currentSchema, entityId }) =>
      Effect.all([
        Record.has(currentSchema.entities, entityId)
          ? Effect.fail(new EntityIdAlreadyExistsError({ entityId }))
          : Effect.void,
        parseEntity(
          {
            entityId,
            entityType: input.type,
            attributes: input.attributes,
            parentId: input.parentId,
            entities: currentSchema.entities,
          },
          builder,
        ),
      ]),
    ),
    Effect.bind("parsedAttributes", () =>
      parseEntityAttributes(input.type, input.attributes, builder),
    ),
    Effect.bind("newEntity", ({ parsedAttributes }) =>
      Effect.succeed({
        type: input.type,
        attributes: parsedAttributes,
        parentId: input.parentId,
      }),
    ),
    Effect.bind("updatedSchema", ({ currentSchema, entityId, newEntity }) =>
      pipe(
        Record.set(currentSchema.entities, entityId, newEntity),
        (entities) =>
          pipe(
            Option.fromNullable(input.parentId),
            Option.map((parentId) =>
              pipe(
                Option.fromNullable(currentSchema.entities[parentId]),
                Option.map((parent) =>
                  pipe(
                    Option.fromNullable(input.index),
                    Option.map((index) =>
                      pipe(
                        Array.insertAt(parent.children ?? [], index, entityId),
                        Option.getOrElse(() =>
                          Array.append(parent.children ?? [], entityId),
                        ),
                      ),
                    ),
                    Option.getOrElse(() =>
                      Array.append(parent.children ?? [], entityId),
                    ),
                    (updatedChildren) =>
                      Record.modify(entities, parentId, (parentEntity) => ({
                        ...parentEntity,
                        children: updatedChildren,
                      })),
                  ),
                ),
                Option.map((updatedEntities) => ({
                  ...currentSchema,
                  entities: updatedEntities,
                })),
                Option.getOrElse(() => ({
                  ...currentSchema,
                  entities,
                })),
              ),
            ),
            Option.getOrElse(() => ({
              entities,
              root: pipe(
                Option.fromNullable(input.index),
                Option.flatMap((index) =>
                  Array.insertAt(currentSchema.root, index, entityId),
                ),
                Option.getOrElse(() =>
                  Array.append(currentSchema.root, entityId),
                ),
              ),
            })),
          ),
        Effect.succeed,
      ),
    ),
    Effect.tap(({ updatedSchema }) =>
      Effect.sync(() =>
        store.setState((prev) => ({
          ...prev,
          schema: updatedSchema as ParsedSchema<TBuilder>,
        })),
      ),
    ),
    Effect.map(({ newEntity }) => newEntity),
  );
}

function parseInitialBuilderStoreData<TBuilder extends Builder>(
  builder: TBuilder,
  initialData?: Partial<BuilderStoreData<TBuilder>>,
): Effect.Effect<
  BuilderStoreData<TBuilder>,
  SchemaParseError | AttributeErrorsParsingError
> {
  return pipe(
    Option.fromNullable(initialData?.schema),
    Option.map((schema) => parseSchemaEffectfully(schema, builder)),
    Option.getOrElse(() =>
      Effect.succeed({
        entities: {},
        root: [],
      } as ParsedSchema<TBuilder>),
    ),
    Effect.flatMap((parsedSchema) =>
      pipe(
        Option.fromNullable(initialData?.attributeErrors),
        Option.map((attributeErrors) =>
          parseAttributeErrors(attributeErrors, parsedSchema, builder),
        ),
        Option.getOrElse(() =>
          Effect.succeed({} as AttributeErrorsByEntityId<TBuilder>),
        ),
        Effect.map((parsedAttributeErrors) => ({
          schema: parsedSchema,
          attributeErrors: parsedAttributeErrors,
        })),
      ),
    ),
  );
}

export function createEffectfulBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: CreateBuilderStoreOptions<TBuilder>,
): Effect.Effect<
  EffectfulBuilderStore<TBuilder>,
  SchemaParseError | AttributeErrorsParsingError
> {
  return pipe(
    parseInitialBuilderStoreData(builder, options?.initialData),
    Effect.map((builderStoreData) =>
      pipe(
        new Store<BuilderStoreData<TBuilder>>(builderStoreData),
        (dataStore): EffectfulBuilderStore<TBuilder> => ({
          _getUnsafeDataStore: () => dataStore,
          getData: () => Effect.sync(() => dataStore.state),
          addEntity: (input) => addEntity(input, dataStore, builder),
          removeEntity: (id) => removeEntity(id, dataStore),
        }),
      ),
    ),
  );
}

export function createBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: CreateBuilderStoreOptions<TBuilder>,
): Result<
  BuilderStore<TBuilder>,
  SchemaParseError | AttributeErrorsParsingError
> {
  return Effect.runSync(
    asResult(
      pipe(
        createEffectfulBuilderStore(builder, options),
        Effect.map(
          (builderStore): BuilderStore<TBuilder> => ({
            _getUnsafeDataStore:
              builderStore._getUnsafeDataStore.bind(builderStore),
            getData: () => Effect.runSync(builderStore.getData()),
            addEntity: (input) =>
              Effect.runSync(
                asResult(
                  addEntity(input, builderStore._getUnsafeDataStore(), builder),
                ),
              ),
            removeEntity: (id) =>
              Effect.runSync(asResult(builderStore.removeEntity(id))),
          }),
        ),
      ),
    ),
  );
}
