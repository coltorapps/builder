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
import { EntityDefinition } from "./entity-definition";
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
  schema: schemaParsing.DraftSchema<TBuilder>;
  entitiesAttributesErrors: schemaValidation.EntitiesAttributesErrors;
  schemaError?: InferBuilderSchemaRefineError<TBuilder> | undefined;
}

interface AddEntityPayload<
  TBuilder extends Builder = Builder,
  TType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> extends Omit<schemaParsing.DraftSchemaEntity<TBuilder, TType>, "children"> {
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
    entity: schemaParsing.DraftSchemaEntityWithId<TBuilder, TType>;
    index: number;
  },
  | IndexOutOfBoundsError
  | EntityIdAlreadyExistsError
  | schemaParsing.EntityAttributesParseError
  | schemaParsing.EntityConstraintError
  | schemaParsing.InvalidEntityIdError
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
  getEntity(
    entityId: string,
  ): ModeOutput<
    TResultMode,
    schemaParsing.DraftSchemaEntityWithId<TBuilder>,
    schemaParsing.EntityNotFoundError
  >;
  cloneEntity(
    entityId: string,
    index?: number,
  ): ModeOutput<
    TResultMode,
    { entityId: string; clonedEntityId: string; index: number },
    | IndexOutOfBoundsError
    | EntityIdAlreadyExistsError
    | schemaParsing.InvalidEntityIdError
    | schemaParsing.EntityNotFoundError
  >;
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
    index?: number,
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
  resetEntityAttributeValue(
    entityId: string,
    attributeName: string,
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
  clearEntityAttributeError(
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
  clearEntityAttributesErrors(entityId: string): ModeOutput<
    TResultMode,
    {
      entityId: string;
    },
    schemaParsing.EntityNotFoundError
  >;
  clearEntitiesAttributesErrors(): ModeOutput<TResultMode>;
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
      schema: schemaParsing.DraftSchema<TBuilder>;
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
    }
  >;
  clearSchemaError(): ModeOutput<TResultMode>;
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
  schema: schemaParsing.DraftSchema,
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
          schemaParsing.getDraftSchemaEntity(entityId, schema.entities),
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
  schema: schemaParsing.DraftSchema,
): Effect.Effect<ReadonlyArray<string>, schemaParsing.EntityNotFoundError> {
  return pipe(
    schemaParsing.getDraftSchemaEntity(entityId, schema.entities),
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
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("entity", ({ currentSchema }) =>
      schemaParsing.getDraftSchemaEntity(entityId, currentSchema.entities),
    ),
    Effect.bind("filteredEntities", ({ currentSchema }) =>
      pipe(
        collectEntityDescendants(entityId, currentSchema),
        Effect.map((descendants) => Array.appendAll([entityId], descendants)),
        Effect.map((idsToRemove) =>
          Record.filter(
            currentSchema.entities,
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
            schemaParsing.getDraftSchemaEntity(parentId, filteredEntities),
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
    Effect.bind("newSchema", ({ currentSchema, newEntities }) =>
      Effect.succeed({
        entities: newEntities,
        root: Array.filter(currentSchema.root, (id) => id !== entityId),
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
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("entity", ({ currentSchema }) =>
      schemaParsing.getDraftSchemaEntity(entityId, currentSchema.entities),
    ),
    Effect.bind("updatedSchema", ({ currentSchema, entity }) =>
      pipe(
        Option.fromNullable(entity.parentId),
        Option.map((parentId) =>
          pipe(
            schemaParsing.getDraftSchemaEntity(
              parentId,
              currentSchema.entities,
            ),
            Effect.map((parentEntity) =>
              parentEntity.children
                ? Array.filter(parentEntity.children, (id) => id !== entityId)
                : [],
            ),
            Effect.flatMap((filteredChildren) =>
              insertAt(filteredChildren, entityId, index),
            ),
            Effect.map((updatedChildren) =>
              Struct.evolve(currentSchema, {
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
            Array.filter(currentSchema.root, (id) => id !== entityId),
            (filteredRoot) =>
              pipe(
                insertAt(filteredRoot, entityId, index),
                Effect.map((updatedRoot) =>
                  Struct.evolve(currentSchema, {
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
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("entity", ({ currentSchema }) =>
      schemaParsing.getDraftSchemaEntity(entityId, currentSchema.entities),
    ),
    Effect.tap(({ entity }) =>
      schemaParsing.validateParentRequiredness(
        entity.type,
        newParentId,
        builder,
      ),
    ),
    Effect.bind("maybeNewParent", ({ currentSchema }) =>
      pipe(
        Option.fromNullable(newParentId),
        Option.map((parentId) =>
          pipe(
            schemaParsing.getDraftSchemaEntity(
              parentId,
              currentSchema.entities,
            ),
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
            schemaParsing.validateEntityParentAllowance(
              entity.type,
              parent.type,
              builder,
            ),
            schemaParsing.validateEntityChildrenAllowance(
              parent.type,
              entity.type,
              builder,
            ),
          ]),
        ),
        Option.getOrElse(() => Effect.void),
      ),
    ),
    Effect.bind("removed", ({ currentSchema, entity }) =>
      pipe(
        Option.fromNullable(entity.parentId),
        Option.map((parentId) =>
          pipe(
            schemaParsing.getDraftSchemaEntity(
              parentId,
              currentSchema.entities,
            ),
            Effect.map((parentEntity) =>
              Record.modify(currentSchema.entities, parentId, (parent) => ({
                ...parent,
                children: Array.filter(
                  parentEntity.children ?? [],
                  (id) => id !== entityId,
                ),
              })),
            ),
            Effect.map((entities) => ({
              entities,
              root: Array.filter(currentSchema.root, (id) => id !== entityId),
            })),
          ),
        ),
        Option.getOrElse(() =>
          Effect.succeed({
            entities: currentSchema.entities,
            root: Array.filter(currentSchema.root, (id) => id !== entityId),
          }),
        ),
      ),
    ),
    Effect.bind("result", ({ removed, maybeNewParent }) =>
      pipe(
        Option.fromNullable(maybeNewParent),
        Option.map(({ id: parentId }) =>
          pipe(
            schemaParsing.getDraftSchemaEntity(parentId, removed.entities),
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
                  schemaParsing.cleanDraftSchemaEntity(
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
        dataStore.setState((prev) =>
          Struct.evolve(prev, {
            schema: () => result.schema,
          }),
        ),
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

function validateEntityIdUniqueness(
  entityId: string,
  entities: schemaParsing.DraftSchema["entities"],
): Effect.Effect<void, EntityIdAlreadyExistsError> {
  return Effect.if(Record.has(entities, entityId), {
    onTrue: () => Effect.fail(new EntityIdAlreadyExistsError({ entityId })),
    onFalse: () => Effect.void,
  });
}

function addEntityToSchema(
  entityId: string,
  newEntity: schemaParsing.DraftSchemaEntity,
  schema: schemaParsing.DraftSchema,
  index?: number,
): Effect.Effect<
  {
    updatedSchema: schemaParsing.DraftSchema;
    index: number;
  },
  IndexOutOfBoundsError | schemaParsing.EntityNotFoundError
> {
  return pipe(
    Record.set(
      schema.entities,
      entityId,
      schemaParsing.cleanDraftSchemaEntity(newEntity),
    ),
    (entities) =>
      pipe(
        Option.fromNullable(newEntity.parentId),
        Option.map((parentId) =>
          pipe(
            schemaParsing.getDraftSchemaEntity(parentId, schema.entities),
            Effect.flatMap((parentEntity) =>
              pipe(
                insertAt(parentEntity.children ?? [], entityId, index),
                Effect.map((updatedChildren) => ({
                  updatedSchema: Struct.evolve(schema, {
                    entities: () =>
                      Record.modify(entities, parentId, (parentEntity) => ({
                        ...parentEntity,
                        children: updatedChildren.array,
                      })),
                  }),
                  index: updatedChildren.index,
                })),
              ),
            ),
          ),
        ),
        Option.getOrElse(() =>
          pipe(
            insertAt(schema.root, entityId, index),
            Effect.map((updatedRoot) => ({
              updatedSchema: Struct.evolve(schema, {
                entities: () => entities,
                root: () => updatedRoot.array,
              }),
              index: updatedRoot.index,
            })),
          ),
        ),
      ),
  );
}

function generateEntityId(
  entities: schemaParsing.DraftSchema["entities"],
  builder: Builder,
): Effect.Effect<
  string,
  schemaParsing.InvalidEntityIdError | EntityIdAlreadyExistsError
> {
  return pipe(
    Effect.sync(() => builder.generateEntityId()),
    Effect.tap((id) =>
      Effect.all([
        schemaParsing.validateEntityId(id, builder),
        validateEntityIdUniqueness(id, entities),
      ]),
    ),
  );
}

export function addEntity<
  TBuilder extends Builder,
  TType extends KeyofStringIntersection<TBuilder["entities"]>,
>(
  [payload]: [AddEntityPayload<TBuilder, TType>],
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
  builder: TBuilder,
): AddEntityOutput<EffectMode, TBuilder, TType> {
  return pipe(
    Effect.Do,
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("entityId", ({ currentSchema }) =>
      pipe(
        Option.fromNullable(payload.id),
        Option.map((id) =>
          pipe(
            Effect.succeed(id),
            Effect.tap((id) => schemaParsing.validateEntityId(id, builder)),
            Effect.tap((id) =>
              validateEntityIdUniqueness(id, currentSchema.entities),
            ),
          ),
        ),
        Option.getOrElse(() =>
          generateEntityId(currentSchema.entities, builder),
        ),
      ),
    ),
    Effect.tap(({ currentSchema }) =>
      Effect.all([
        schemaParsing.validateEntityConstraints(
          {
            entityType: payload.type,
            attributes: payload.attributes,
            parentId: payload.parentId,
            entities: currentSchema.entities,
          },
          builder,
        ),
      ]),
    ),
    Effect.bind("parsedAttributes", () =>
      pipe(
        schemaParsing.parseEntityAttributes(
          payload.type,
          schemaParsing.computeEntityAttributesWithDefaults(
            payload.attributes,
            payload.type,
            builder,
          ),
          builder,
        ),
        (result) =>
          Effect.if(Record.isEmptyRecord(result.errors), {
            onTrue: () => Effect.succeed(result.values),
            onFalse: () =>
              Effect.fail(
                new schemaParsing.EntityAttributesParseError({
                  errors: result.errors,
                }),
              ),
          }),
      ),
    ),
    Effect.bind("newEntity", ({ parsedAttributes }) =>
      Effect.succeed(
        schemaParsing.cleanDraftSchemaEntity({
          ...payload,
          attributes: parsedAttributes,
        }),
      ),
    ),
    Effect.bind("result", ({ currentSchema, entityId, newEntity }) =>
      addEntityToSchema(entityId, newEntity, currentSchema, payload.index),
    ),
    Effect.tap(({ result }) =>
      Effect.sync(() =>
        dataStore.setState((prev) =>
          Struct.evolve(prev, {
            schema: () => result.updatedSchema,
          }),
        ),
      ),
    ),
    Effect.map(({ newEntity, entityId, result }) => ({
      entity: {
        ...newEntity,
        id: entityId,
      },
      index: result.index,
    })),
  );
}

export function getEntity(
  [entityId]: Parameters<GenericBuilderStore["getEntity"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["getEntity"]> {
  return pipe(
    Effect.sync(() => dataStore.state.schema.entities),
    Effect.flatMap((entities) =>
      schemaParsing.getDraftSchemaEntity(entityId, entities),
    ),
    Effect.map((entity) => ({
      ...entity,
      id: entityId,
    })),
  );
}

export function cloneEntity(
  [entityId, maybeIndex]: Parameters<GenericBuilderStore["cloneEntity"]>,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["cloneEntity"]> {
  return pipe(
    Effect.Do,
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("source", ({ currentSchema }) =>
      schemaParsing.getDraftSchemaEntity(entityId, currentSchema.entities),
    ),
    Effect.bind("descendants", ({ currentSchema }) =>
      collectEntityDescendants(entityId, currentSchema),
    ),
    Effect.bind("targetIndex", ({ currentSchema, source }) =>
      pipe(
        Option.fromNullable(maybeIndex),
        Option.map((index) => Effect.succeed(index)),
        Option.getOrElse(() =>
          pipe(
            Option.fromNullable(source.parentId),
            Option.map((parentId) =>
              pipe(
                schemaParsing.getDraftSchemaEntity(
                  parentId,
                  currentSchema.entities,
                ),
                Effect.map((parent) =>
                  pipe(parent.children ?? [], (kids) =>
                    pipe(
                      Array.findFirstIndex(kids, (id) => id === entityId),
                      Option.map((i) => i + 1),
                      Option.getOrElse(() => kids.length),
                    ),
                  ),
                ),
              ),
            ),
            Option.getOrElse(() =>
              pipe(
                Array.findFirstIndex(
                  currentSchema.root,
                  (id) => id === entityId,
                ),
                Option.map((i) => i + 1),
                Option.getOrElse(() => currentSchema.root.length),
                (index) => Effect.succeed(index),
              ),
            ),
          ),
        ),
      ),
    ),
    Effect.bind("rootCloneId", ({ currentSchema }) =>
      generateEntityId(currentSchema.entities, builder),
    ),
    Effect.bind(
      "rootClone",
      ({ currentSchema, source, targetIndex, rootCloneId }) =>
        pipe(
          source,
          (entity) => ({
            type: entity.type,
            attributes: { ...entity.attributes },
            parentId: entity.parentId,
          }),
          (clonedEntity) =>
            addEntityToSchema(
              rootCloneId,
              clonedEntity,
              currentSchema,
              targetIndex,
            ),
        ),
    ),
    Effect.bind(
      "folded",
      ({ currentSchema, descendants, rootClone, rootCloneId }) =>
        pipe(
          descendants,
          Effect.reduce(
            {
              schema: rootClone.updatedSchema,
              idMap: Record.set({}, entityId, rootCloneId),
            },
            (acc, originalChildId) =>
              pipe(
                generateEntityId(acc.schema.entities, builder),
                Effect.flatMap((childCloneId) =>
                  pipe(
                    schemaParsing.getDraftSchemaEntity(
                      originalChildId,
                      currentSchema.entities,
                    ),
                    Effect.map((origChild) => ({
                      type: origChild.type,
                      attributes: { ...origChild.attributes },
                      parentId: pipe(
                        Option.fromNullable(origChild.parentId),
                        Option.flatMap((oldPid) =>
                          Option.fromNullable(acc.idMap[oldPid]),
                        ),
                        Option.getOrElse(() => undefined),
                      ),
                    })),
                    Effect.flatMap((clonedChild) =>
                      addEntityToSchema(childCloneId, clonedChild, acc.schema),
                    ),
                    Effect.map((result) => ({
                      schema: result.updatedSchema,
                      idMap: Record.set(
                        acc.idMap,
                        originalChildId,
                        childCloneId,
                      ),
                    })),
                  ),
                ),
              ),
          ),
        ),
    ),
    Effect.tap(({ folded }) =>
      Effect.sync(() =>
        dataStore.setState((s) =>
          Struct.evolve(s, {
            schema: () => folded.schema,
          }),
        ),
      ),
    ),
    Effect.map(({ rootClone, rootCloneId }) => ({
      entityId,
      clonedEntityId: rootCloneId,
      index: rootClone.index,
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
      schemaParsing.parseDraftSchemaEffectfully(schema, builder),
    ),
    Option.getOrElse(() =>
      Effect.succeed<schemaParsing.DraftSchema>({
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

function getEntityDefinition(
  entityType: string,
  builder: Builder,
): Effect.Effect<EntityDefinition> {
  return pipe(
    Option.fromNullable(builder.entities[entityType]),
    Option.map((entityDefinition) => Effect.succeed(entityDefinition)),
    Option.getOrElse(() =>
      Effect.dieMessage(
        `Entity type "${entityType}" not found in builder. This is likely a bug.`,
      ),
    ),
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
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("entity", ({ currentSchema }) =>
      schemaParsing.getDraftSchemaEntity(entityId, currentSchema.entities),
    ),
    Effect.bind("attributeDefinition", ({ entity }) =>
      pipe(
        getEntityDefinition(entity.type, builder),
        Effect.flatMap((entityDefinition) =>
          schemaParsing.getAttributeDefinition(
            entity.type,
            entityDefinition,
            attributeName,
          ),
        ),
      ),
    ),
    Effect.bind("valueParseResult", ({ attributeDefinition }) =>
      Effect.succeed(
        schemaParsing.parseEntityAttribute(
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
              dataStore.setState((prevState) =>
                Struct.evolve(prevState, {
                  schema: (schema) =>
                    Struct.evolve(schema, {
                      entities: (entities) =>
                        Record.modify(entities, entityId, (existingEntity) =>
                          schemaParsing.cleanDraftSchemaEntity({
                            ...existingEntity,
                            attributes: {
                              ...existingEntity.attributes,
                              [attributeName]: value,
                            },
                          }),
                        ),
                    }),
                }),
              ),
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

export function resetEntityAttributeValue(
  [entityId, attributeName]: Parameters<
    GenericBuilderStore["resetEntityAttributeValue"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["resetEntityAttributeValue"]> {
  return pipe(
    Effect.Do,
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("entity", ({ currentSchema }) =>
      schemaParsing.getDraftSchemaEntity(entityId, currentSchema.entities),
    ),
    Effect.bind("attributeDefinition", ({ entity }) =>
      pipe(
        getEntityDefinition(entity.type, builder),
        Effect.flatMap((entityDefinition) =>
          schemaParsing.getAttributeDefinition(
            entity.type,
            entityDefinition,
            attributeName,
          ),
        ),
      ),
    ),
    Effect.flatMap(({ attributeDefinition }) =>
      pipe(
        Option.fromNullable(
          attributeDefinition.defaultValue?.bind(attributeDefinition),
        ),
        Option.map((defaultValueFn) =>
          setEntityAttributeValue(
            [
              entityId,
              attributeName,
              defaultValueFn({
                attribute: {
                  metadata: attributeDefinition.metadata,
                  name: attributeName,
                },
              }),
            ],
            dataStore,
            builder,
          ),
        ),
        Option.getOrElse(() =>
          pipe(
            clearEntityAttributeValue(
              [entityId, attributeName],
              dataStore,
              builder,
            ),
            Effect.map(() => ({
              entityId,
              attributeName,
              attributeValue: undefined,
            })),
          ),
        ),
      ),
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
      schemaParsing.getDraftSchemaEntity(entityId, entities),
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
        dataStore.setState((prevState) =>
          Struct.evolve(prevState, {
            schema: (schema) =>
              Struct.evolve(schema, {
                entities: (entities) =>
                  Record.set(
                    entities,
                    entityId,
                    schemaParsing.cleanDraftSchemaEntity({
                      ...entity,
                      attributes: Record.remove(
                        entity.attributes ?? {},
                        attributeName,
                      ),
                    }),
                  ),
              }),
          }),
        ),
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
      schemaParsing.getDraftSchemaEntity(entityId, entities),
    ),
    Effect.tap((entity) =>
      Effect.sync(() =>
        dataStore.setState((prevState) =>
          Struct.evolve(prevState, {
            schema: (schema) =>
              Struct.evolve(schema, {
                entities: (entities) =>
                  Record.set(
                    entities,
                    entityId,
                    schemaParsing.cleanDraftSchemaEntity(
                      Struct.omit(entity, "attributes"),
                    ),
                  ),
              }),
          }),
        ),
      ),
    ),
    Effect.flatMap(() => Effect.succeed({ entityId })),
  );
}

export function clearEntityAttributeError(
  [entityId, attributeName]: Parameters<
    GenericBuilderStore["clearEntityAttributeError"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: Builder,
): ReturnType<GenericBuilderStore["clearEntityAttributeError"]> {
  return pipe(
    Effect.sync(() => dataStore.state.schema.entities),
    Effect.flatMap((entities) =>
      schemaParsing.getDraftSchemaEntity(entityId, entities),
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
            entitiesAttributesErrors: (errors) =>
              schemaValidation.cleanEntitiesAttributeErrors(
                Record.set(
                  errors,
                  entityId,
                  Record.remove(errors[entityId] ?? {}, attributeName),
                ),
              ),
          }),
        ),
      ),
    ),
    Effect.flatMap(() => Effect.succeed({ entityId, attributeName })),
  );
}

export function clearEntityAttributesErrors(
  [entityId]: Parameters<GenericBuilderStore["clearEntityAttributesErrors"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["clearEntityAttributesErrors"]> {
  return pipe(
    Effect.sync(() => dataStore.state.schema.entities),
    Effect.tap((entities) =>
      schemaParsing.validateEntityIdExistance(entityId, entities),
    ),
    Effect.tap(() =>
      Effect.sync(() =>
        dataStore.setState((prevState) =>
          Struct.evolve(prevState, {
            entitiesAttributesErrors: (errors) =>
              schemaValidation.cleanEntitiesAttributeErrors(
                Record.remove(errors, entityId),
              ),
          }),
        ),
      ),
    ),
    Effect.flatMap(() => Effect.succeed({ entityId })),
  );
}

export function clearEntitiesAttributesErrors(
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["clearEntitiesAttributesErrors"]> {
  return pipe(
    Effect.sync(() =>
      dataStore.setState((prevState) =>
        Struct.evolve(prevState, {
          entitiesAttributesErrors: () => ({}),
        }),
      ),
    ),
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
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("entity", ({ currentSchema }) =>
      schemaParsing.getDraftSchemaEntity(entityId, currentSchema.entities),
    ),
    Effect.bind("attributeDefinition", ({ entity }) =>
      pipe(
        getEntityDefinition(entity.type, builder),
        Effect.flatMap((entityDefinition) =>
          schemaParsing.getAttributeDefinition(
            entity.type,
            entityDefinition,
            attributeName,
          ),
        ),
      ),
    ),
    Effect.bind(
      "validatedValueResult",
      ({ entity, attributeDefinition, currentSchema }) =>
        schemaValidation.validateEntityAttribute(
          entityId,
          entity,
          attributeName,
          entity.attributes?.[attributeName],
          attributeDefinition,
          currentSchema,
          builder,
        ),
    ),
    Effect.flatMap(({ validatedValueResult, entity }) =>
      Either.match(validatedValueResult, {
        onLeft: (error) =>
          pipe(
            Effect.sync(() =>
              dataStore.setState((prevState) =>
                Struct.evolve(prevState, {
                  entitiesAttributesErrors: (entitiesAttributesErrors) =>
                    schemaValidation.cleanEntitiesAttributeErrors(
                      Record.set(
                        entitiesAttributesErrors,
                        entityId,
                        Record.set(
                          entitiesAttributesErrors[entityId] ?? {},
                          attributeName,
                          error,
                        ),
                      ),
                    ),
                }),
              ),
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
              dataStore.setState((prevState) =>
                Struct.evolve(prevState, {
                  schema: (schema) =>
                    Struct.evolve(schema, {
                      entities: (entities) =>
                        Record.modify(entities, entityId, (existingEntity) =>
                          schemaParsing.cleanDraftSchemaEntity({
                            ...existingEntity,
                            attributes: {
                              ...existingEntity.attributes,
                              [attributeName]: value,
                            },
                          }),
                        ),
                    }),
                  entitiesAttributesErrors: (entitiesAttributesErrors) =>
                    schemaValidation.cleanEntitiesAttributeErrors(
                      Record.set(
                        entitiesAttributesErrors,
                        entityId,
                        Record.remove(
                          entitiesAttributesErrors[entityId] ?? {},
                          attributeName,
                        ),
                      ),
                    ),
                }),
              ),
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
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("entity", ({ currentSchema }) =>
      schemaParsing.getDraftSchemaEntity(entityId, currentSchema.entities),
    ),
    Effect.bind("validatedAttributes", ({ entity, currentSchema }) =>
      schemaValidation.validateEntityAttributes(
        entityId,
        entity,
        currentSchema,
        builder,
      ),
    ),
    Effect.flatMap(({ validatedAttributes, currentSchema }) =>
      pipe(
        Effect.succeed({
          ...currentSchema.entities[entityId]?.attributes,
          ...validatedAttributes.values,
        }),
        Effect.tap((attributes) =>
          Effect.sync(() =>
            dataStore.setState((prevState) =>
              Struct.evolve(prevState, {
                schema: (schema) =>
                  Struct.evolve(schema, {
                    entities: (entities) =>
                      Record.modify(entities, entityId, (existingEntity) =>
                        schemaParsing.cleanDraftSchemaEntity({
                          ...existingEntity,
                          attributes,
                        }),
                      ),
                  }),
                entitiesAttributesErrors: (errors) =>
                  schemaValidation.cleanEntitiesAttributeErrors(
                    Record.set(errors, entityId, validatedAttributes.errors),
                  ),
              }),
            ),
          ),
        ),
        Effect.flatMap((attributes) =>
          Effect.if(Record.isEmptyRecord(validatedAttributes.errors), {
            onTrue: () => Effect.succeed({ entityId, attributes }),
            onFalse: () =>
              Effect.fail(
                new schemaValidation.EntityAttributesValidationError({
                  errors: validatedAttributes.errors,
                }),
              ),
          }),
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
    Effect.bind("currentSchema", () =>
      Effect.sync(() => dataStore.state.schema),
    ),
    Effect.bind("validationResult", ({ currentSchema }) =>
      schemaValidation.validateEntitiesAttributes(currentSchema, builder),
    ),
    Effect.flatMap(({ validationResult, currentSchema }) =>
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
          Effect.if(Record.isEmptyRecord(validationResult.attributeErrors), {
            onTrue: () =>
              Effect.succeed({
                schema: Struct.evolve(currentSchema, {
                  entities: () => validationResult.entities,
                }),
              }),
            onFalse: () =>
              Effect.fail(
                new schemaValidation.EntitiesAttributesValidationError({
                  errors: validationResult.attributeErrors,
                }),
              ),
          }),
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
      schemaParsing.getDraftSchemaEntity(entityId, entities),
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
      schemaParsing.getDraftSchemaEntity(entityId, entities),
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
          getEntity: (...args) => getEntity(args, dataStore),
          cloneEntity: (...args) => cloneEntity(args, dataStore, builder),
          removeEntity: (...args) => removeEntity(args, dataStore),
          setEntityIndex: (...args) => setEntityIndex(args, dataStore),
          setEntityParent: (...args) =>
            setEntityParent(args, dataStore, builder),
          setEntityAttributeValue: (...args) =>
            setEntityAttributeValue(args, dataStore, builder),
          resetEntityAttributeValue: (...args) =>
            resetEntityAttributeValue(args, dataStore, builder),
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
          clearEntityAttributeError: (...args) =>
            clearEntityAttributeError(args, dataStore, builder),
          clearEntityAttributesErrors: (...args) =>
            clearEntityAttributesErrors(args, dataStore),
          clearEntitiesAttributesErrors: () =>
            clearEntitiesAttributesErrors(dataStore),
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
            getEntity: (...args) =>
              runSyncAsResult(builderStore.getEntity(...args)),
            cloneEntity: (...args) =>
              runSyncAsResult(builderStore.cloneEntity(...args)),
            removeEntity: (...args) =>
              runSyncAsResult(builderStore.removeEntity(...args)),
            setEntityIndex: (...args) =>
              runSyncAsResult(builderStore.setEntityIndex(...args)),
            setEntityParent: (...args) =>
              runSyncAsResult(builderStore.setEntityParent(...args)),
            setEntityAttributeValue: (...args) =>
              runSyncAsResult(builderStore.setEntityAttributeValue(...args)),
            resetEntityAttributeValue: (...args) =>
              runSyncAsResult(builderStore.resetEntityAttributeValue(...args)),
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
            clearEntityAttributeError: (...args) =>
              runSyncAsResult(builderStore.clearEntityAttributeError(...args)),
            clearEntityAttributesErrors: (...args) =>
              runSyncAsResult(
                builderStore.clearEntityAttributesErrors(...args),
              ),
            clearEntitiesAttributesErrors: () =>
              runSyncAsResult(builderStore.clearEntitiesAttributesErrors()),
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
