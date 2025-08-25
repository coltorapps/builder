import { Store as DataStore } from "@tanstack/store";
import {
  Array,
  Data,
  Effect,
  Either,
  Option,
  pipe,
  Record,
  Struct,
} from "effect";

import { type Builder, type InferBuilderSchemaRefineError } from "./builder";
import * as schemaParsing from "./schema-parsing";
import * as schemaValidation from "./schema-validation";
import {
  flatMapAsResult,
  runPromiseAsResult,
  runSyncAsResult,
  type EffectMode,
  type KeyofStringIntersection,
  type ModeAsyncOutput,
  type ModeOutput,
  type Result,
  type ResultMode,
} from "./utils";

interface BuilderStoreData<TBuilder extends Builder = Builder> {
  schema: schemaParsing.ParsedSchema<TBuilder>;
  entitiesAttributesErrors: schemaValidation.EntitiesAttributesErrors;
  schemaError?: InferBuilderSchemaRefineError<TBuilder> | undefined;
}

interface AddEntityPayload<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> extends Omit<schemaParsing.ParsedSchemaEntity<TBuilder, TType>, "children"> {
  id?: string | undefined;
  index?: number | undefined;
}

type AddEntityOutput<
  TResultMode = EffectMode,
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> = ModeOutput<
  TResultMode,
  {
    entity: schemaParsing.ParsedSchemaEntityWithId<TBuilder, TType>;
    index: number;
  },
  | EntityIdAlreadyExistsError
  | IndexOutOfBoundsError
  | schemaParsing.EntityAttributesParseError
  | schemaParsing.ParseEntityError
>;

type ValidateSchemaOutput<
  TResultMode = EffectMode,
  TBuilder extends Builder = Builder,
> = ModeAsyncOutput<
  TResultMode,
  { schema: schemaValidation.ValidatedSchema<TBuilder> },
  | schemaValidation.EntitiesAttributesValidationError
  | schemaValidation.SchemaRefineError
>;

interface GenericBuilderStore<
  TBuilder extends Builder = Builder,
  TResultMode = EffectMode,
> {
  /** @internal */
  _getUnsafeDataStore(): DataStore<BuilderStoreData<TBuilder>>;
  getBuilder(): TBuilder;
  getData(): Readonly<BuilderStoreData<TBuilder>>;
  subscribe(
    listener: (
      currentValue: BuilderStoreData<TBuilder>,
      prevValue: BuilderStoreData<TBuilder>,
    ) => void,
  ): () => void;
  addEntity<TType extends KeyofStringIntersection<TBuilder["entities"]>>(
    payload: AddEntityPayload<TBuilder, TType>,
  ): AddEntityOutput<TResultMode, TBuilder, TType>;
  removeEntity(
    entityId: string,
  ): ModeOutput<
    TResultMode,
    { entityId: string },
    schemaParsing.EntityNotFoundError
  >;
  setEntityIndex(
    entityId: string,
    index: number,
  ): ModeOutput<
    TResultMode,
    { entityId: string; index: number },
    IndexOutOfBoundsError | schemaParsing.EntityNotFoundError
  >;
  setEntityParent(
    entityId: string,
    parentId: string | undefined,
    index?: number | undefined,
  ): ModeOutput<
    TResultMode,
    { entityId: string; parentId?: string | undefined; index: number },
    | IndexOutOfBoundsError
    | schemaParsing.EntityNotFoundError
    | schemaParsing.ParentNotAllowedError
    | schemaParsing.ChildNotAllowedError
    | schemaParsing.ParentRequiredError
  >;
  setData(
    data: BuilderStoreData<TBuilder>,
  ): ModeOutput<
    TResultMode,
    BuilderStoreData<TBuilder>,
    schemaParsing.SchemaParseError | EntitiesAttributesErrorsParseError
  >;
  setEntityAttributeValue(
    entityId: string,
    attributeName: string,
    attributeValue: unknown,
  ): ModeOutput<
    TResultMode,
    {
      entityId: string;
      attributeName: string;
      attributeValue: unknown;
    },
    | schemaParsing.EntityNotFoundError
    | schemaParsing.InvalidAttributeNameError
    | schemaParsing.EntityAttributeParseError
  >;
  clearEntityAttributeValue(
    entityId: string,
    attributeName: string,
  ): ModeOutput<
    TResultMode,
    {
      entityId: string;
      attributeName: string;
    },
    schemaParsing.EntityNotFoundError | schemaParsing.InvalidAttributeNameError
  >;
  clearEntityAttributesValues(entityId: string): ModeOutput<
    TResultMode,
    {
      entityId: string;
    },
    schemaParsing.EntityNotFoundError
  >;
  validateEntityAttribute(
    entityId: string,
    attributeName: string,
  ): ModeAsyncOutput<
    TResultMode,
    {
      entityId: string;
      attributeName: string;
      attributeValue: unknown;
    },
    | schemaParsing.EntityNotFoundError
    | schemaParsing.InvalidAttributeNameError
    | schemaValidation.EntityAttributeValidationError
  >;
  validateEntityAttributes(entityId: string): ModeAsyncOutput<
    TResultMode,
    {
      entityId: string;
      attributes: Record<string, unknown>;
    },
    | schemaParsing.EntityNotFoundError
    | schemaValidation.EntityAttributesValidationError
  >;
  validateEntitiesAttributes(): ModeAsyncOutput<
    TResultMode,
    {
      schema: schemaParsing.ParsedSchema<TBuilder>;
    },
    schemaValidation.EntitiesAttributesValidationError
  >;
  setEntityAttributeError(
    entityId: string,
    attributeName: string,
    attributeError: unknown,
  ): ModeOutput<
    TResultMode,
    { entityId: string; attributeName: string; attributeError: unknown },
    schemaParsing.EntityNotFoundError | schemaParsing.InvalidAttributeNameError
  >;
  setEntityAttributesErrors(
    entityId: string,
    attributesErrors: schemaValidation.EntityAttributesErrors,
  ): ModeOutput<
    TResultMode,
    {
      entityId: string;
      attributesErrors: schemaValidation.EntityAttributesErrors;
    },
    schemaParsing.EntityNotFoundError | schemaParsing.InvalidAttributeNameError
  >;
  setEntitiesAttributesErrors(
    attributesErrors: schemaValidation.EntitiesAttributesErrors,
  ): ModeOutput<
    TResultMode,
    {
      attributesErrors: schemaValidation.EntitiesAttributesErrors;
    },
    EntitiesAttributesErrorsParseError
  >;
  setSchemaError(
    schemaError: InferBuilderSchemaRefineError<TBuilder>,
  ): ModeOutput<
    TResultMode,
    {
      schemaError: InferBuilderSchemaRefineError<TBuilder>;
    },
    never
  >;
  clearSchemaError(): ModeOutput<TResultMode, void, never>;
  validateSchema(): ValidateSchemaOutput<TResultMode, TBuilder>;
}

export type EffectfulBuilderStore<TBuilder extends Builder> =
  GenericBuilderStore<TBuilder, EffectMode>;

export type BuilderStore<TBuilder extends Builder> = GenericBuilderStore<
  TBuilder,
  ResultMode
>;

type CreateBuilderStoreError =
  | schemaParsing.SchemaParseError
  | EntitiesAttributesErrorsParseError;

interface CreateBuilderStoreOptions<TBuilder extends Builder = Builder> {
  initialData?: Partial<BuilderStoreData<TBuilder>> | undefined;
}

export class EntitiesAttributesErrorsParseError extends Data.TaggedError(
  "EntitiesAttributesErrorsParseError",
)<{
  readonly cause:
    | schemaParsing.EntityNotFoundError
    | schemaParsing.InvalidAttributeNameError;
}> {}

export class EntityIdAlreadyExistsError extends Data.TaggedError(
  "EntityIdAlreadyExistsError",
)<{
  readonly entityId: string;
}> {}

export class IndexOutOfBoundsError extends Data.TaggedError(
  "IndexOutOfBoundsError",
)<{
  readonly index: number;
  readonly arrayLength: number;
}> {}

export function parseEntitiesAttributesErrors(
  entitiesAttributesErrors: schemaValidation.EntitiesAttributesErrors,
  schema: schemaParsing.ParsedSchema,
  builder: Builder,
): Effect.Effect<
  schemaValidation.EntitiesAttributesErrors,
  EntitiesAttributesErrorsParseError
> {
  return pipe(
    Effect.forEach(
      Record.toEntries(entitiesAttributesErrors),
      ([entityId, entityErrors]) =>
        pipe(
          schemaParsing.getParsedEntity(entityId, schema.entities),
          Effect.flatMap((entity) =>
            schemaParsing.validateEntityAttributeNames(
              entity.type,
              Record.keys(entityErrors),
              builder,
            ),
          ),
        ),
    ),
    Effect.as(entitiesAttributesErrors),
    Effect.mapError(
      (error) => new EntitiesAttributesErrorsParseError({ cause: error }),
    ),
  );
}

export function collectEntityDescendants(
  entityId: string,
  schema: schemaParsing.ParsedSchema,
): Effect.Effect<ReadonlyArray<string>, schemaParsing.EntityNotFoundError> {
  return pipe(
    schemaParsing.getParsedEntity(entityId, schema.entities),
    Effect.flatMap((entity) =>
      pipe(
        Option.fromNullable(entity.children),
        Option.map((children) =>
          pipe(
            children,
            Array.map((childId) =>
              pipe(
                collectEntityDescendants(childId, schema),
                Effect.map((descendants) =>
                  Array.appendAll([childId], descendants),
                ),
              ),
            ),
            Effect.all,
            Effect.map(Array.flatten),
          ),
        ),
        Option.getOrElse(() => Effect.succeed([])),
      ),
    ),
  );
}

export function removeEntity(
  [entityId]: Parameters<GenericBuilderStore["removeEntity"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["removeEntity"]> {
  return pipe(
    Effect.Do,
    Effect.bind("schema", () => Effect.sync(() => dataStore.state.schema)),
    Effect.bind("entity", ({ schema }) =>
      schemaParsing.getParsedEntity(entityId, schema.entities),
    ),
    Effect.bind("filteredEntities", ({ schema }) =>
      pipe(
        collectEntityDescendants(entityId, schema),
        Effect.map((descendants) => Array.appendAll([entityId], descendants)),
        Effect.map((idsToRemove) =>
          Record.filter(
            schema.entities,
            (_, id) => !Array.contains(idsToRemove, id),
          ),
        ),
      ),
    ),
    Effect.bind("newEntities", ({ entity, filteredEntities }) =>
      pipe(
        Option.fromNullable(entity.parentId),
        Option.map((parentId) =>
          pipe(
            schemaParsing.getParsedEntity(parentId, filteredEntities),
            Effect.map((parentEntity) =>
              Record.modify(filteredEntities, parentId, (parent) => ({
                ...parent,
                children: Array.filter(
                  parentEntity.children ?? [],
                  (id) => id !== entityId,
                ),
              })),
            ),
          ),
        ),
        Option.getOrElse(() => Effect.succeed(filteredEntities)),
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
        dataStore.setState((prevState) =>
          Struct.evolve(prevState, {
            schema: () => newSchema,
          }),
        ),
      ),
    ),
    Effect.as({ entityId }),
  );
}

export function setEntityIndex(
  [entityId, index]: Parameters<GenericBuilderStore["setEntityIndex"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["setEntityIndex"]> {
  return pipe(
    Effect.Do,
    Effect.bind("schema", () => Effect.sync(() => dataStore.state.schema)),
    Effect.bind("entity", ({ schema }) =>
      schemaParsing.getParsedEntity(entityId, schema.entities),
    ),
    Effect.bind("updatedSchema", ({ schema, entity }) =>
      pipe(
        Option.fromNullable(entity.parentId),
        Option.map((parentId) =>
          pipe(
            schemaParsing.getParsedEntity(parentId, schema.entities),
            Effect.map((parentEntity) =>
              parentEntity.children
                ? Array.filter(parentEntity.children, (id) => id !== entityId)
                : [],
            ),
            Effect.flatMap((filteredChildren) =>
              insertAt(filteredChildren, entityId, index),
            ),
            Effect.map((updatedChildren) =>
              Struct.evolve(schema, {
                entities: (entities) =>
                  Record.modify(entities, parentId, (parentEntity) => ({
                    ...parentEntity,
                    children: updatedChildren.array,
                  })),
              }),
            ),
          ),
        ),
        Option.getOrElse(() =>
          pipe(
            Array.filter(schema.root, (id) => id !== entityId),
            (filteredRoot) =>
              pipe(
                insertAt(filteredRoot, entityId, index),
                Effect.map((updatedRoot) =>
                  Struct.evolve(schema, {
                    root: () => updatedRoot.array,
                  }),
                ),
              ),
          ),
        ),
      ),
    ),
    Effect.tap(({ updatedSchema }) =>
      Effect.sync(() =>
        dataStore.setState((prevState) =>
          Struct.evolve(prevState, {
            schema: () => updatedSchema,
          }),
        ),
      ),
    ),
    Effect.as({ entityId, index }),
  );
}

export function setEntityParent(
  [entityId, newParentId, index]: Parameters<
    GenericBuilderStore["setEntityParent"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["setEntityParent"]> {
  return pipe(
    Effect.Do,
    Effect.bind("schema", () => Effect.sync(() => dataStore.state.schema)),
    Effect.bind("entity", ({ schema }) =>
      schemaParsing.getParsedEntity(entityId, schema.entities),
    ),
    Effect.tap(({ entity }) =>
      schemaParsing.validateParentRequired(entity.type, newParentId, builder),
    ),
    Effect.bind("maybeNewParent", ({ schema }) =>
      pipe(
        Option.fromNullable(newParentId),
        Option.map((parentId) =>
          pipe(
            schemaParsing.getParsedEntity(parentId, schema.entities),
            Effect.map((parentEntity) => ({
              id: parentId,
              entity: parentEntity,
            })),
          ),
        ),
        Option.getOrElse(() => Effect.succeed(undefined)),
      ),
    ),
    Effect.tap(({ entity, maybeNewParent }) =>
      pipe(
        Option.fromNullable(maybeNewParent),
        Option.map(({ entity: parent }) =>
          Effect.all([
            schemaParsing.validateEntityParent(
              entity.type,
              parent.type,
              builder,
            ),
            schemaParsing.validateEntityChildren(
              parent.type,
              entity.type,
              builder,
            ),
          ]),
        ),
        Option.getOrElse(() => Effect.void),
      ),
    ),
    Effect.bind("removed", ({ schema, entity }) =>
      pipe(
        Option.fromNullable(entity.parentId),
        Option.map((parentId) =>
          pipe(
            schemaParsing.getParsedEntity(parentId, schema.entities),
            Effect.map((parentEntity) =>
              Record.modify(schema.entities, parentId, (parent) => ({
                ...parent,
                children: Array.filter(
                  parentEntity.children ?? [],
                  (id) => id !== entityId,
                ),
              })),
            ),
            Effect.map((entities) => ({
              entities,
              root: Array.filter(schema.root, (id) => id !== entityId),
            })),
          ),
        ),
        Option.getOrElse(() =>
          Effect.succeed({
            entities: schema.entities,
            root: Array.filter(schema.root, (id) => id !== entityId),
          }),
        ),
      ),
    ),
    Effect.bind("result", ({ removed, maybeNewParent }) =>
      pipe(
        Option.fromNullable(maybeNewParent),
        Option.map(({ id: parentId }) =>
          pipe(
            schemaParsing.getParsedEntity(parentId, removed.entities),
            Effect.flatMap((parentEntity) =>
              insertAt(
                parentEntity.children
                  ? Array.filter(parentEntity.children, (id) => id !== entityId)
                  : [],
                entityId,
                index,
              ),
            ),
            Effect.map((updatedChildren) => ({
              schema: {
                entities: pipe(
                  Record.modify(removed.entities, parentId, (parentEntity) => ({
                    ...parentEntity,
                    children: updatedChildren.array,
                  })),
                  (entities) =>
                    Record.modify(entities, entityId, (entity) => ({
                      ...entity,
                      parentId,
                    })),
                ),
                root: removed.root,
              },
              index: updatedChildren.index,
            })),
          ),
        ),
        Option.getOrElse(() =>
          pipe(
            insertAt(removed.root, entityId, index),
            Effect.map((updatedRoot) => ({
              schema: {
                entities: Record.modify(removed.entities, entityId, (entity) =>
                  schemaParsing.cleanParsedEntity(
                    Struct.omit(entity, "parentId"),
                  ),
                ),
                root: updatedRoot.array,
              },
              index: updatedRoot.index,
            })),
          ),
        ),
      ),
    ),
    Effect.tap(({ result }) =>
      Effect.sync(() =>
        dataStore.setState((prev) => ({
          ...prev,
          schema: result.schema,
        })),
      ),
    ),
    Effect.map(({ result }) => ({
      entityId,
      parentId: newParentId,
      index: result.index,
    })),
  );
}

function insertAt<T>(
  array: readonly T[],
  item: T,
  index: number = array.length,
): Effect.Effect<
  { array: readonly T[]; index: number },
  IndexOutOfBoundsError
> {
  return pipe(
    pipe(
      Array.insertAt(array, index, item),
      Option.map((result) => Effect.succeed({ array: result, index })),
      Option.getOrElse(() =>
        Effect.fail(
          new IndexOutOfBoundsError({
            index,
            arrayLength: array.length,
          }),
        ),
      ),
    ),
  );
}

export function addEntity<
  TBuilder extends Builder,
  TType extends KeyofStringIntersection<TBuilder["entities"]>,
>(
  [payload]: Parameters<GenericBuilderStore["addEntity"]>,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
  builder: TBuilder,
): AddEntityOutput<EffectMode, TBuilder, TType> {
  return pipe(
    Effect.Do,
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("entityId", () =>
      pipe(
        Option.fromNullable(payload.id),
        Option.map((id) => Effect.succeed(id)),
        Option.getOrElse(() => Effect.sync(() => builder.generateEntityId())),
      ),
    ),
    Effect.tap(({ currentSchema, entityId }) =>
      Effect.all([
        Record.has(currentSchema.entities, entityId)
          ? Effect.fail(new EntityIdAlreadyExistsError({ entityId }))
          : Effect.void,
        schemaParsing.validateEntity(
          {
            entityId,
            entityType: payload.type,
            attributes: payload.attributes,
            parentId: payload.parentId,
            entities: currentSchema.entities,
          },
          builder,
        ),
      ]),
    ),
    Effect.bind("attributesWithDefaults", () =>
      pipe(
        Option.fromNullable(builder.entities[payload.type]?.attributes),
        Option.map((attributeDefinitions) =>
          pipe(
            Record.toEntries(attributeDefinitions),
            Array.filterMap(([key, attributeDefinition]) =>
              !Record.has(payload.attributes ?? {}, key)
                ? pipe(
                    Option.fromNullable(
                      attributeDefinition.defaultValue?.bind(
                        attributeDefinition,
                      ),
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
            (defaultValues) => ({ ...payload.attributes, ...defaultValues }),
          ),
        ),
        Option.getOrElse(() => payload.attributes),
        (attributes) => Effect.succeed(attributes),
      ),
    ),
    Effect.bind("parsedAttributes", ({ attributesWithDefaults }) =>
      pipe(
        schemaParsing.parseAttributes(
          payload.type,
          attributesWithDefaults,
          builder,
        ),
        (result) =>
          Record.isEmptyRecord(result.errors)
            ? Effect.succeed(result.values)
            : Effect.fail(
                new schemaParsing.EntityAttributesParseError({
                  errors: result.errors,
                }),
              ),
      ),
    ),
    Effect.bind("newEntity", ({ parsedAttributes }) =>
      Effect.succeed(
        schemaParsing.cleanParsedEntity({
          ...payload,
          attributes: parsedAttributes,
        }),
      ),
    ),
    Effect.bind("result", ({ currentSchema, entityId, newEntity }) =>
      pipe(
        Record.set(currentSchema.entities, entityId, newEntity),
        (entities) =>
          pipe(
            Option.fromNullable(payload.parentId),
            Option.map((parentId) =>
              pipe(
                schemaParsing.getParsedEntity(parentId, currentSchema.entities),
                Effect.flatMap((parentEntity) =>
                  pipe(
                    insertAt(
                      parentEntity.children ?? [],
                      entityId,
                      payload.index,
                    ),
                    Effect.map((updatedChildren) => ({
                      updatedSchema: {
                        ...currentSchema,
                        entities: Record.modify(
                          entities,
                          parentId,
                          (parentEntity) => ({
                            ...parentEntity,
                            children: updatedChildren.array,
                          }),
                        ),
                      },
                      index: updatedChildren.index,
                    })),
                  ),
                ),
              ),
            ),
            Option.getOrElse(() =>
              pipe(
                insertAt(currentSchema.root, entityId, payload.index),
                Effect.map((updatedRoot) => ({
                  updatedSchema: {
                    ...currentSchema,
                    entities,
                    root: updatedRoot.array,
                  },
                  index: updatedRoot.index,
                })),
              ),
            ),
          ),
      ),
    ),
    Effect.tap(({ result }) =>
      Effect.sync(() =>
        dataStore.setState((prev) => ({
          ...prev,
          schema: result.updatedSchema,
        })),
      ),
    ),
    Effect.map(({ newEntity, entityId, result }) => ({
      entity: {
        ...newEntity,
        id: entityId,
      } as schemaParsing.ParsedSchemaEntityWithId<TBuilder, TType>,
      index: result.index,
    })),
  );
}

function parsePartialBuilderStoreData(
  builder: Builder,
  partialData?: Partial<BuilderStoreData> | undefined,
): Effect.Effect<
  BuilderStoreData,
  schemaParsing.SchemaParseError | EntitiesAttributesErrorsParseError
> {
  return pipe(
    Option.fromNullable(partialData?.schema),
    Option.map((schema) =>
      schemaParsing.parseSchemaEffectfully(schema, builder),
    ),
    Option.getOrElse(() =>
      Effect.succeed<schemaParsing.ParsedSchema>({
        entities: {},
        root: [],
      }),
    ),
    Effect.flatMap((parsedSchema) =>
      pipe(
        Option.fromNullable(partialData?.entitiesAttributesErrors),
        Option.map((attributeErrors) =>
          parseEntitiesAttributesErrors(attributeErrors, parsedSchema, builder),
        ),
        Option.getOrElse(() => Effect.succeed({})),
        Effect.map((entitiesAttributesErrors) => ({
          schema: parsedSchema,
          entitiesAttributesErrors,
          ...(partialData?.schemaError
            ? { schemaError: partialData.schemaError }
            : {}),
        })),
      ),
    ),
  );
}

function setData(
  [data]: Parameters<GenericBuilderStore["setData"]>,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["setData"]> {
  return pipe(
    parsePartialBuilderStoreData(builder, data),
    Effect.tap((parsedData) =>
      Effect.sync(() => dataStore.setState(parsedData)),
    ),
    Effect.map((parsedData) => parsedData),
  );
}

export function setEntityAttributeValue(
  [entityId, attributeName, attributeValue]: Parameters<
    GenericBuilderStore["setEntityAttributeValue"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["setEntityAttributeValue"]> {
  return pipe(
    Effect.Do,
    Effect.bind("schema", () => Effect.sync(() => dataStore.state.schema)),
    Effect.bind("entity", ({ schema }) =>
      schemaParsing.getParsedEntity(entityId, schema.entities),
    ),
    Effect.bind("attributeDefinition", ({ entity }) =>
      schemaParsing.getAttributeDefinition(
        entity.type,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        builder.entities[entity.type]!,
        attributeName,
      ),
    ),
    Effect.bind("valueParseResult", ({ attributeDefinition }) =>
      Effect.succeed(
        schemaParsing.parseAttribute(
          attributeName,
          attributeValue,
          attributeDefinition,
        ),
      ),
    ),
    Effect.flatMap(({ valueParseResult, entity }) =>
      Either.match(valueParseResult, {
        onLeft: (error) =>
          Effect.fail(
            new schemaParsing.EntityAttributeParseError({
              entityId,
              entityType: entity.type,
              attributeName,
              cause: error,
            }),
          ),
        onRight: (value) =>
          pipe(
            Effect.sync(() =>
              dataStore.setState((prevState) => ({
                ...prevState,
                schema: {
                  ...prevState.schema,
                  entities: pipe(
                    Record.modify(
                      prevState.schema.entities,
                      entityId,
                      (existingEntity) =>
                        schemaParsing.cleanParsedEntity({
                          ...existingEntity,
                          attributes: {
                            ...existingEntity.attributes,
                            [attributeName]: value,
                          },
                        }),
                    ),
                  ),
                },
              })),
            ),
            Effect.flatMap(() =>
              Effect.succeed({
                entityId,
                attributeName,
                attributeValue: value,
              }),
            ),
          ),
      }),
    ),
  );
}

export function clearEntityAttributeValue(
  [entityId, attributeName]: Parameters<
    GenericBuilderStore["clearEntityAttributeValue"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["clearEntityAttributeValue"]> {
  return pipe(
    Effect.sync(() => dataStore.state.schema.entities),
    Effect.flatMap((entities) =>
      schemaParsing.getParsedEntity(entityId, entities),
    ),
    Effect.tap((entity) =>
      schemaParsing.validateEntityAttributeName(
        entity.type,
        attributeName,
        builder,
      ),
    ),
    Effect.tap((entity) =>
      Effect.sync(() =>
        dataStore.setState((prevState) => ({
          ...prevState,
          schema: {
            ...prevState.schema,
            entities: Record.set(
              prevState.schema.entities,
              entityId,
              schemaParsing.cleanParsedEntity({
                ...entity,
                attributes: Record.remove(
                  entity.attributes ?? {},
                  attributeName,
                ),
              }),
            ),
          },
        })),
      ),
    ),
    Effect.flatMap(() => Effect.succeed({ entityId, attributeName })),
  );
}

export function clearEntityAttributesValues(
  [entityId]: Parameters<GenericBuilderStore["clearEntityAttributesValues"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["clearEntityAttributesValues"]> {
  return pipe(
    Effect.sync(() => dataStore.state.schema.entities),
    Effect.flatMap((entities) =>
      schemaParsing.getParsedEntity(entityId, entities),
    ),
    Effect.tap((entity) =>
      Effect.sync(() =>
        dataStore.setState((prevState) => ({
          ...prevState,
          schema: {
            ...prevState.schema,
            entities: Record.set(
              prevState.schema.entities,
              entityId,
              schemaParsing.cleanParsedEntity(
                Struct.omit(entity, "attributes"),
              ),
            ),
          },
        })),
      ),
    ),
    Effect.flatMap(() => Effect.succeed({ entityId })),
  );
}

export function validateEntityAttribute(
  [entityId, attributeName]: Parameters<
    GenericBuilderStore["validateEntityAttribute"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["validateEntityAttribute"]> {
  return pipe(
    Effect.Do,
    Effect.bind("schema", () => Effect.sync(() => dataStore.state.schema)),
    Effect.bind("entity", ({ schema }) =>
      schemaParsing.getParsedEntity(entityId, schema.entities),
    ),
    Effect.bind("attributeDefinition", ({ entity }) =>
      schemaParsing.getAttributeDefinition(
        entity.type,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        builder.entities[entity.type]!,
        attributeName,
      ),
    ),
    Effect.bind(
      "validatedValueResult",
      ({ entity, attributeDefinition, schema }) =>
        schemaValidation.validateEntityAttribute(
          entityId,
          entity,
          attributeName,
          entity.attributes?.[attributeName],
          attributeDefinition,
          schema,
          builder,
        ),
    ),
    Effect.flatMap(({ validatedValueResult, entity }) =>
      Either.match(validatedValueResult, {
        onLeft: (error) =>
          pipe(
            Effect.sync(() =>
              dataStore.setState((prevState) => ({
                ...prevState,
                entitiesAttributesErrors:
                  schemaValidation.cleanEntitiesAttributeErrors(
                    Record.set(
                      prevState.entitiesAttributesErrors,
                      entityId,
                      Record.set(
                        prevState.entitiesAttributesErrors[entityId] ?? {},
                        attributeName,
                        error,
                      ),
                    ),
                  ),
              })),
            ),
            Effect.flatMap(() =>
              Effect.fail(
                new schemaValidation.EntityAttributeValidationError({
                  entityId,
                  entityType: entity.type,
                  attributeName,
                  cause: error,
                }),
              ),
            ),
          ),
        onRight: (value) =>
          pipe(
            Effect.sync(() =>
              dataStore.setState((prevState) => ({
                ...prevState,
                schema: {
                  ...prevState.schema,
                  entities: pipe(
                    Record.modify(
                      prevState.schema.entities,
                      entityId,
                      (existingEntity) =>
                        schemaParsing.cleanParsedEntity({
                          ...existingEntity,
                          attributes: {
                            ...existingEntity.attributes,
                            [attributeName]: value,
                          },
                        }),
                    ),
                  ),
                },
                entitiesAttributesErrors:
                  schemaValidation.cleanEntitiesAttributeErrors(
                    Record.set(
                      prevState.entitiesAttributesErrors,
                      entityId,
                      Record.remove(
                        prevState.entitiesAttributesErrors[entityId] ?? {},
                        attributeName,
                      ),
                    ),
                  ),
              })),
            ),
            Effect.flatMap(() =>
              Effect.succeed({
                entityId,
                attributeName,
                attributeValue: value,
              }),
            ),
          ),
      }),
    ),
  );
}

export function validateEntityAttributes(
  [entityId]: Parameters<GenericBuilderStore["validateEntityAttributes"]>,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["validateEntityAttributes"]> {
  return pipe(
    Effect.Do,
    Effect.bind("schema", () => Effect.sync(() => dataStore.state.schema)),
    Effect.bind("entity", ({ schema }) =>
      schemaParsing.getParsedEntity(entityId, schema.entities),
    ),
    Effect.bind("validatedAttributes", ({ entity, schema }) =>
      schemaValidation.validateEntityAttributes(
        entityId,
        entity,
        schema,
        builder,
      ),
    ),
    Effect.flatMap(({ validatedAttributes, schema }) =>
      pipe(
        Effect.succeed({
          ...schema.entities[entityId]?.attributes,
          ...validatedAttributes.values,
        }),
        Effect.tap((attributes) =>
          Effect.sync(() =>
            dataStore.setState((prevState) => ({
              ...prevState,
              schema: {
                ...prevState.schema,
                entities: Record.modify(
                  prevState.schema.entities,
                  entityId,
                  (existingEntity) =>
                    schemaParsing.cleanParsedEntity({
                      ...existingEntity,
                      attributes,
                    }),
                ),
              },
              entitiesAttributesErrors:
                schemaValidation.cleanEntitiesAttributeErrors(
                  Record.set(
                    prevState.entitiesAttributesErrors,
                    entityId,
                    validatedAttributes.errors,
                  ),
                ),
            })),
          ),
        ),
        Effect.flatMap((attributes) =>
          Record.isEmptyRecord(validatedAttributes.errors)
            ? Effect.succeed({
                entityId,
                attributes,
              })
            : Effect.fail(
                new schemaValidation.EntityAttributesValidationError({
                  errors: validatedAttributes.errors,
                }),
              ),
        ),
      ),
    ),
  );
}

export function validateEntitiesAttributes(
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["validateEntitiesAttributes"]> {
  return pipe(
    Effect.Do,
    Effect.bind("schema", () => Effect.sync(() => dataStore.state.schema)),
    Effect.bind("validationResult", ({ schema }) =>
      schemaValidation.validateEntitiesAttributes(schema, builder),
    ),
    Effect.flatMap(({ validationResult, schema }) =>
      pipe(
        Effect.sync(() =>
          dataStore.setState((prevState) =>
            Struct.evolve(prevState, {
              schema: (schema) =>
                Struct.evolve(schema, {
                  entities: () => validationResult.entities,
                }),
              entitiesAttributesErrors: () =>
                schemaValidation.cleanEntitiesAttributeErrors(
                  validationResult.attributeErrors,
                ),
            }),
          ),
        ),
        Effect.flatMap(() =>
          Record.isEmptyRecord(validationResult.attributeErrors)
            ? Effect.succeed({
                schema: Struct.evolve(schema, {
                  entities: () => validationResult.entities,
                }),
              })
            : Effect.fail(
                new schemaValidation.EntitiesAttributesValidationError({
                  errors: validationResult.attributeErrors,
                }),
              ),
        ),
      ),
    ),
  );
}

export function validateSchema<TBuilder extends Builder>(
  dataStore: DataStore<BuilderStoreData>,
  builder: TBuilder,
): ValidateSchemaOutput<EffectMode, TBuilder> {
  return pipe(
    validateEntitiesAttributes(dataStore, builder),
    Effect.flatMap(({ schema }) =>
      schemaValidation.refineSchema(
        schema as schemaValidation.ValidatedSchema<TBuilder>,
        builder,
      ),
    ),
    Effect.tap(() =>
      Effect.sync(() =>
        dataStore.setState((prevState) =>
          Struct.omit(prevState, "schemaError"),
        ),
      ),
    ),
    Effect.tapErrorTag("SchemaRefineError", (error) =>
      Effect.sync(() =>
        dataStore.setState((prevState) => ({
          ...prevState,
          schemaError: error.cause,
        })),
      ),
    ),
    Effect.map((refinedSchema) => ({
      schema: refinedSchema,
    })),
  );
}

export function setEntityAttributeError(
  [entityId, attributeName, attributeError]: Parameters<
    GenericBuilderStore["setEntityAttributeError"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["setEntityAttributeError"]> {
  return pipe(
    Effect.sync(() => dataStore.state.schema.entities),
    Effect.flatMap((entities) =>
      schemaParsing.getParsedEntity(entityId, entities),
    ),
    Effect.tap((entity) =>
      schemaParsing.validateEntityAttributeName(
        entity.type,
        attributeName,
        builder,
      ),
    ),
    Effect.tap(() =>
      Effect.sync(() =>
        dataStore.setState((prevState) =>
          Struct.evolve(prevState, {
            entitiesAttributesErrors: (prevErrors) =>
              schemaValidation.cleanEntitiesAttributeErrors(
                Record.set(
                  prevErrors,
                  entityId,
                  Record.set(
                    prevErrors[entityId] ?? {},
                    attributeName,
                    attributeError,
                  ),
                ),
              ),
          }),
        ),
      ),
    ),
    Effect.map(() => ({ entityId, attributeName, attributeError })),
  );
}

export function setEntityAttributesErrors(
  [entityId, attributesErrors]: Parameters<
    GenericBuilderStore["setEntityAttributesErrors"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["setEntityAttributesErrors"]> {
  return pipe(
    Effect.sync(() => dataStore.state.schema.entities),
    Effect.flatMap((entities) =>
      schemaParsing.getParsedEntity(entityId, entities),
    ),
    Effect.tap((entity) =>
      schemaParsing.validateEntityAttributeNames(
        entity.type,
        Record.keys(attributesErrors),
        builder,
      ),
    ),
    Effect.tap(() =>
      Effect.sync(() =>
        dataStore.setState((prevState) =>
          Struct.evolve(prevState, {
            entitiesAttributesErrors: (prevErrors) =>
              schemaValidation.cleanEntitiesAttributeErrors(
                Record.set(prevErrors, entityId, attributesErrors),
              ),
          }),
        ),
      ),
    ),
    Effect.map(() => ({ entityId, attributesErrors })),
  );
}

export function setEntitiesAttributesErrors(
  [entitiesAttributesErrors]: Parameters<
    GenericBuilderStore["setEntitiesAttributesErrors"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["setEntitiesAttributesErrors"]> {
  return pipe(
    Effect.sync(() => dataStore.state.schema),
    Effect.flatMap((schema) =>
      parseEntitiesAttributesErrors(entitiesAttributesErrors, schema, builder),
    ),
    Effect.tap(() =>
      Effect.sync(() =>
        dataStore.setState((prevState) =>
          Struct.evolve(prevState, {
            entitiesAttributesErrors: () => entitiesAttributesErrors,
          }),
        ),
      ),
    ),
    Effect.map(() => ({ attributesErrors: entitiesAttributesErrors })),
  );
}

export function setSchemaError(
  [schemaError]: Parameters<GenericBuilderStore["setSchemaError"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["setSchemaError"]> {
  return pipe(
    Effect.sync(() =>
      dataStore.setState((prevState) => ({
        ...prevState,
        schemaError,
      })),
    ),
    Effect.map(() => ({ schemaError })),
  );
}

export function clearSchemaError(
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["clearSchemaError"]> {
  return Effect.sync(() =>
    dataStore.setState((prevState) => Struct.omit(prevState, "schemaError")),
  );
}

export function createEffectfulBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: CreateBuilderStoreOptions<TBuilder> | undefined,
): Effect.Effect<EffectfulBuilderStore<TBuilder>, CreateBuilderStoreError> {
  return pipe(
    parsePartialBuilderStoreData(builder, options?.initialData),
    Effect.map((builderStoreData) =>
      pipe(
        new DataStore<BuilderStoreData<TBuilder>>(builderStoreData),
        (dataStore): EffectfulBuilderStore<TBuilder> => ({
          _getUnsafeDataStore: () => dataStore,
          getBuilder: () => builder,
          getData: () => dataStore.state,
          addEntity: (...args) => addEntity(args, dataStore, builder),
          removeEntity: (...args) => removeEntity(args, dataStore),
          setEntityIndex: (...args) => setEntityIndex(args, dataStore),
          setEntityParent: (...args) =>
            setEntityParent(args, dataStore, builder),
          setEntityAttributeValue: (...args) =>
            setEntityAttributeValue(args, dataStore, builder),
          clearEntityAttributeValue: (...args) =>
            clearEntityAttributeValue(args, dataStore, builder),
          clearEntityAttributesValues: (...args) =>
            clearEntityAttributesValues(args, dataStore),
          validateEntityAttribute: (...args) =>
            validateEntityAttribute(args, dataStore, builder),
          validateEntityAttributes: (...args) =>
            validateEntityAttributes(args, dataStore, builder),
          validateEntitiesAttributes: () =>
            validateEntitiesAttributes(dataStore, builder),
          setEntityAttributeError: (...args) =>
            setEntityAttributeError(args, dataStore, builder),
          setEntityAttributesErrors: (...args) =>
            setEntityAttributesErrors(args, dataStore, builder),
          setEntitiesAttributesErrors: (...args) =>
            setEntitiesAttributesErrors(args, dataStore, builder),
          validateSchema: () => validateSchema(dataStore, builder),
          setData: (...args) => setData(args, dataStore, builder),
          setSchemaError: (...args) => setSchemaError(args, dataStore),
          clearSchemaError: () => clearSchemaError(dataStore),
          subscribe: (listener) =>
            dataStore.subscribe(({ currentVal, prevVal }) =>
              listener(currentVal, prevVal),
            ),
        }),
      ),
    ),
  );
}

export function createBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: CreateBuilderStoreOptions<TBuilder> | undefined,
): Result<BuilderStore<TBuilder>, CreateBuilderStoreError> {
  return Effect.runSync(
    flatMapAsResult(
      pipe(
        createEffectfulBuilderStore(builder, options),
        Effect.map(
          (builderStore): BuilderStore<TBuilder> => ({
            ...builderStore,
            addEntity: (...args) =>
              runSyncAsResult(builderStore.addEntity(...args)),
            removeEntity: (...args) =>
              runSyncAsResult(builderStore.removeEntity(...args)),
            setEntityIndex: (...args) =>
              runSyncAsResult(builderStore.setEntityIndex(...args)),
            setEntityParent: (...args) =>
              runSyncAsResult(builderStore.setEntityParent(...args)),
            setEntityAttributeValue: (...args) =>
              runSyncAsResult(builderStore.setEntityAttributeValue(...args)),
            clearEntityAttributeValue: (...args) =>
              runSyncAsResult(builderStore.clearEntityAttributeValue(...args)),
            clearEntityAttributesValues: (...args) =>
              runSyncAsResult(
                builderStore.clearEntityAttributesValues(...args),
              ),
            validateEntityAttribute: (...args) =>
              runPromiseAsResult(builderStore.validateEntityAttribute(...args)),
            validateEntityAttributes: (...args) =>
              runPromiseAsResult(
                builderStore.validateEntityAttributes(...args),
              ),
            validateEntitiesAttributes: () =>
              runPromiseAsResult(builderStore.validateEntitiesAttributes()),
            setEntityAttributeError: (...args) =>
              runSyncAsResult(builderStore.setEntityAttributeError(...args)),
            setEntityAttributesErrors: (...args) =>
              runSyncAsResult(builderStore.setEntityAttributesErrors(...args)),
            setEntitiesAttributesErrors: (...args) =>
              runSyncAsResult(
                builderStore.setEntitiesAttributesErrors(...args),
              ),
            validateSchema: () =>
              runPromiseAsResult(builderStore.validateSchema()),
            setData: (...args) =>
              runSyncAsResult(builderStore.setData(...args)),
            setSchemaError: (...args) =>
              runSyncAsResult(builderStore.setSchemaError(...args)),
            clearSchemaError: () =>
              runSyncAsResult(builderStore.clearSchemaError()),
          }),
        ),
      ),
    ),
  );
}
