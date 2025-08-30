import { Store as DataStore } from "@tanstack/store";
import * as A from "effect/Array";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as M from "effect/Match";
import * as O from "effect/Option";
import * as R from "effect/Record";
import * as S from "effect/Struct";

import type * as builderDefinition from "./builder-definition";
import * as entityDefinition from "./entity-definition";
import * as schemaParsing from "./schema-parsing";
import * as schemaValidation from "./schema-validation";
import * as utils from "./utils";

export interface BuilderStoreData<
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
> {
  schema: schemaParsing.DraftSchema<TBuilder>;
  entitiesAttributesErrors: schemaParsing.EntitiesAttributesErrors;
  schemaError?: builderDefinition.InferBuilderDefinitionSchemaRefineError<TBuilder>;
}

interface AddEntityPayload<
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
  TType extends utils.KeyofStringIntersection<
    TBuilder["entities"]
  > = utils.KeyofStringIntersection<TBuilder["entities"]>,
> extends Omit<
    schemaParsing.DraftSchemaEntity<TBuilder, TType>,
    "children" | "attributes"
  > {
  id?: string;
  index?: number;
  attributes?: schemaParsing.DraftSchemaEntity<TBuilder, TType>["attributes"];
}

type AddEntityOutput<
  TResultMode = utils.EffectMode,
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
  TType extends utils.KeyofStringIntersection<
    TBuilder["entities"]
  > = utils.KeyofStringIntersection<TBuilder["entities"]>,
> = utils.ModeOutput<
  TResultMode,
  {
    entity: schemaParsing.DraftSchemaEntityWithId<TBuilder, TType>;
    index: number;
  },
  | IndexOutOfBoundsError
  | EntityIdAlreadyExistsError
  | schemaParsing.EntityAttributesParseError
  | schemaParsing.InvalidEntityIdError
  | schemaParsing.InvalidEntityTypeError
  | schemaParsing.ParentRequiredError
  | schemaParsing.InvalidAttributeNameError
  | schemaParsing.EntityNotFoundError
  | schemaParsing.ChildNotAllowedError
  | schemaParsing.ParentNotAllowedError
>;

type ValidateSchemaOutput<
  TResultMode = utils.EffectMode,
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
> = utils.ModeAsyncOutput<
  TResultMode,
  { schema: schemaParsing.ParsedSchema<TBuilder> },
  | schemaValidation.EntitiesAttributesValidationError
  | schemaValidation.SchemaRefineError
>;

interface GenericBuilderStore<
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
  TResultMode = utils.EffectMode,
> extends utils.GenericStore<TBuilder, BuilderStoreData<TBuilder>> {
  addEntity<TType extends utils.KeyofStringIntersection<TBuilder["entities"]>>(
    payload: AddEntityPayload<TBuilder, TType>,
  ): AddEntityOutput<TResultMode, TBuilder, TType>;
  getEntity(
    entityId: string,
  ): utils.ModeOutput<
    TResultMode,
    schemaParsing.DraftSchemaEntityWithId<TBuilder>,
    schemaParsing.EntityNotFoundError
  >;
  getEntityIndex(
    entityId: string,
  ): utils.ModeOutput<TResultMode, number, schemaParsing.EntityNotFoundError>;
  cloneEntity(
    entityId: string,
    options?: {
      index?: number;
    },
  ): utils.ModeOutput<
    TResultMode,
    { entityId: string; clonedEntityId: string; index: number },
    | IndexOutOfBoundsError
    | EntityIdAlreadyExistsError
    | schemaParsing.InvalidEntityIdError
    | schemaParsing.EntityNotFoundError
  >;
  removeEntity(
    entityId: string,
  ): utils.ModeOutput<
    TResultMode,
    { entityId: string },
    schemaParsing.EntityNotFoundError
  >;
  setEntityIndex(
    entityId: string,
    index: number | ((currentIndex: number) => number),
  ): utils.ModeOutput<
    TResultMode,
    { entityId: string; index: number },
    IndexOutOfBoundsError | schemaParsing.EntityNotFoundError
  >;
  setEntityParent(
    entityId: string,
    parentId: string | undefined,
    options?: {
      index?: number;
    },
  ): utils.ModeOutput<
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
  ): utils.ModeOutput<
    TResultMode,
    BuilderStoreData<TBuilder>,
    schemaParsing.SchemaParseError | EntitiesAttributesErrorsParseError
  >;
  setEntityAttributeValue(
    entityId: string,
    attributeName: string,
    attributeValue: unknown,
  ): utils.ModeOutput<
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
  ): utils.ModeOutput<
    TResultMode,
    {
      entityId: string;
      attributeName: string;
    },
    schemaParsing.EntityNotFoundError | schemaParsing.InvalidAttributeNameError
  >;
  clearEntityAttributesValues(entityId: string): utils.ModeOutput<
    TResultMode,
    {
      entityId: string;
    },
    schemaParsing.EntityNotFoundError
  >;
  resetEntityAttributeValue(
    entityId: string,
    attributeName: string,
  ): utils.ModeOutput<
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
  ): utils.ModeOutput<
    TResultMode,
    {
      entityId: string;
      attributeName: string;
    },
    schemaParsing.EntityNotFoundError | schemaParsing.InvalidAttributeNameError
  >;
  clearEntityAttributesErrors(entityId: string): utils.ModeOutput<
    TResultMode,
    {
      entityId: string;
    },
    schemaParsing.EntityNotFoundError
  >;
  clearEntitiesAttributesErrors(): utils.ModeOutput<TResultMode>;
  validateEntityAttribute(
    entityId: string,
    attributeName: string,
  ): utils.ModeAsyncOutput<
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
  validateEntityAttributes(entityId: string): utils.ModeAsyncOutput<
    TResultMode,
    {
      entityId: string;
      attributes: Record<string, unknown>;
    },
    | schemaParsing.EntityNotFoundError
    | schemaValidation.EntityAttributesValidationError
  >;
  validateEntitiesAttributes(): utils.ModeAsyncOutput<
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
  ): utils.ModeOutput<
    TResultMode,
    { entityId: string; attributeName: string; attributeError: unknown },
    schemaParsing.EntityNotFoundError | schemaParsing.InvalidAttributeNameError
  >;
  setEntityAttributesErrors(
    entityId: string,
    attributesErrors: schemaParsing.EntityAttributesErrors,
  ): utils.ModeOutput<
    TResultMode,
    {
      entityId: string;
      attributesErrors: schemaParsing.EntityAttributesErrors;
    },
    schemaParsing.EntityNotFoundError | schemaParsing.InvalidAttributeNameError
  >;
  setEntitiesAttributesErrors(
    attributesErrors: schemaParsing.EntitiesAttributesErrors,
  ): utils.ModeOutput<
    TResultMode,
    {
      attributesErrors: schemaParsing.EntitiesAttributesErrors;
    },
    EntitiesAttributesErrorsParseError
  >;
  setSchemaError(
    schemaError: builderDefinition.InferBuilderDefinitionSchemaRefineError<TBuilder>,
  ): utils.ModeOutput<
    TResultMode,
    {
      schemaError: builderDefinition.InferBuilderDefinitionSchemaRefineError<TBuilder>;
    }
  >;
  clearSchemaError(): utils.ModeOutput<TResultMode>;
  validateSchema(): ValidateSchemaOutput<TResultMode, TBuilder>;
}

export type EffectfulBuilderStore<
  TBuilder extends builderDefinition.BuilderDefinition,
> = GenericBuilderStore<TBuilder, utils.EffectMode>;

export type BuilderStore<TBuilder extends builderDefinition.BuilderDefinition> =
  GenericBuilderStore<TBuilder, utils.ResultMode>;

type CreateBuilderStoreError =
  | schemaParsing.SchemaParseError
  | EntitiesAttributesErrorsParseError;

interface CreateBuilderStoreOptions<
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
> {
  initialData?: Partial<BuilderStoreData<TBuilder>>;
}

export class EntitiesAttributesErrorsParseError extends D.TaggedError(
  "EntitiesAttributesErrorsParseError",
)<{
  readonly cause:
    | schemaParsing.EntityNotFoundError
    | schemaParsing.InvalidAttributeNameError;
}> {}

export class EntityIdAlreadyExistsError extends D.TaggedError(
  "EntityIdAlreadyExistsError",
)<{
  readonly entityId: string;
}> {}

export class IndexOutOfBoundsError extends D.TaggedError(
  "IndexOutOfBoundsError",
)<{
  readonly index: number;
  readonly arrayLength: number;
}> {}

export function parseEntitiesAttributesErrors(
  entitiesAttributesErrors: schemaParsing.EntitiesAttributesErrors,
  schema: schemaParsing.DraftSchema,
  builder: builderDefinition.BuilderDefinition,
): E.Effect<
  schemaParsing.EntitiesAttributesErrors,
  EntitiesAttributesErrorsParseError
> {
  return pipe(
    E.forEach(
      R.toEntries(entitiesAttributesErrors),
      ([entityId, entityErrors]) =>
        pipe(
          schemaParsing.getSchemaEntity(entityId, schema.entities),
          E.flatMap((entity) =>
            schemaParsing.validateEntityAttributeNames(
              entity.type,
              R.keys(entityErrors),
              builder,
            ),
          ),
        ),
    ),
    E.as(entitiesAttributesErrors),
    E.mapError(
      (error) => new EntitiesAttributesErrorsParseError({ cause: error }),
    ),
  );
}

export function collectEntityDescendants(
  entityId: string,
  schema: schemaParsing.DraftSchema,
): E.Effect<ReadonlyArray<string>, schemaParsing.EntityNotFoundError> {
  return pipe(
    schemaParsing.getSchemaEntity(entityId, schema.entities),
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

export function removeEntity(
  [entityId]: Parameters<GenericBuilderStore["removeEntity"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["removeEntity"]> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("entity", ({ currentSchema }) =>
      schemaParsing.getSchemaEntity(entityId, currentSchema.entities),
    ),
    E.bind("filteredEntities", ({ currentSchema }) =>
      pipe(
        collectEntityDescendants(entityId, currentSchema),
        E.map((descendants) => A.appendAll([entityId], descendants)),
        E.map((idsToRemove) =>
          R.filter(
            currentSchema.entities,
            (_, id) => !A.contains(idsToRemove, id),
          ),
        ),
      ),
    ),
    E.bind("newEntities", ({ entity, filteredEntities }) =>
      pipe(
        O.fromNullable(entity.parentId),
        O.map((parentId) =>
          pipe(
            schemaParsing.getSchemaEntity(parentId, filteredEntities),
            E.map((parentEntity) =>
              R.modify(filteredEntities, parentId, (parent) => ({
                ...parent,
                children: A.filter(
                  parentEntity.children ?? [],
                  (id) => id !== entityId,
                ),
              })),
            ),
          ),
        ),
        O.getOrElse(() => E.succeed(filteredEntities)),
      ),
    ),
    E.bind("newSchema", ({ currentSchema, newEntities }) =>
      E.succeed({
        entities: newEntities,
        root: A.filter(currentSchema.root, (id) => id !== entityId),
      }),
    ),
    E.tap(({ newSchema }) =>
      E.sync(() =>
        dataStore.setState((prevState) =>
          S.evolve(prevState, {
            schema: () => newSchema,
          }),
        ),
      ),
    ),
    E.as({ entityId }),
  );
}

export function getEntityIndex(
  [entityId]: Parameters<GenericBuilderStore["getEntityIndex"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["getEntityIndex"]> {
  return pipe(
    E.Do,
    E.bind("schema", () => E.sync(() => dataStore.state.schema)),
    E.bind("entity", ({ schema }) =>
      schemaParsing.getSchemaEntity(entityId, schema.entities),
    ),
    E.flatMap(({ entity, schema }) =>
      pipe(
        A.findFirstIndex(
          entity.parentId
            ? (schema.entities[entity.parentId]?.children ?? [])
            : schema.root,
          (id) => id === entityId,
        ),
        O.match({
          onSome: (index) => E.succeed(index),
          onNone: () =>
            E.dieMessage(
              `Couldn't retrieve current index of entity "${entityId}". This is likely a bug.`,
            ),
        }),
      ),
    ),
  );
}

export function setEntityIndex(
  [entityId, indexOrCompute]: Parameters<GenericBuilderStore["setEntityIndex"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["setEntityIndex"]> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("entity", ({ currentSchema }) =>
      schemaParsing.getSchemaEntity(entityId, currentSchema.entities),
    ),
    E.bind("newIndex", () =>
      pipe(
        M.value(indexOrCompute),
        M.when(M.number, (value) => E.succeed(value)),
        M.orElse((computeIndex) =>
          pipe(
            getEntityIndex([entityId], dataStore),
            E.flatMap((index) => E.sync(() => computeIndex(index))),
          ),
        ),
      ),
    ),
    E.bind("updatedSchema", ({ currentSchema, entity, newIndex }) =>
      pipe(
        O.fromNullable(entity.parentId),
        O.map((parentId) =>
          pipe(
            schemaParsing.getSchemaEntity(parentId, currentSchema.entities),
            E.map((parentEntity) =>
              parentEntity.children
                ? A.filter(parentEntity.children, (id) => id !== entityId)
                : [],
            ),
            E.flatMap((filteredChildren) =>
              insertAt(filteredChildren, entityId, newIndex),
            ),
            E.map((updatedChildren) =>
              S.evolve(currentSchema, {
                entities: (entities) =>
                  R.modify(entities, parentId, (parentEntity) => ({
                    ...parentEntity,
                    children: updatedChildren.array,
                  })),
              }),
            ),
          ),
        ),
        O.getOrElse(() =>
          pipe(
            A.filter(currentSchema.root, (id) => id !== entityId),
            (filteredRoot) =>
              pipe(
                insertAt(filteredRoot, entityId, newIndex),
                E.map((updatedRoot) =>
                  S.evolve(currentSchema, {
                    root: () => updatedRoot.array,
                  }),
                ),
              ),
          ),
        ),
      ),
    ),
    E.tap(({ updatedSchema }) =>
      E.sync(() =>
        dataStore.setState((prevState) =>
          S.evolve(prevState, {
            schema: () => updatedSchema,
          }),
        ),
      ),
    ),
    E.map(({ newIndex }) => ({ entityId, index: newIndex })),
  );
}

export function setEntityParent(
  [entityId, newParentId, options]: Parameters<
    GenericBuilderStore["setEntityParent"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["setEntityParent"]> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("entity", ({ currentSchema }) =>
      schemaParsing.getSchemaEntity(entityId, currentSchema.entities),
    ),
    E.tap(({ entity }) =>
      schemaParsing.validateParentRequiredness(
        entity.type,
        newParentId,
        builder,
      ),
    ),
    E.bind("maybeNewParent", ({ currentSchema }) =>
      pipe(
        O.fromNullable(newParentId),
        O.map((parentId) =>
          pipe(
            schemaParsing.getSchemaEntity(parentId, currentSchema.entities),
            E.map((parentEntity) => ({
              id: parentId,
              entity: parentEntity,
            })),
          ),
        ),
        O.getOrElse(() => E.succeed(undefined)),
      ),
    ),
    E.tap(({ entity, maybeNewParent }) =>
      pipe(
        O.fromNullable(maybeNewParent),
        O.map(({ entity: parent }) =>
          E.all([
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
        O.getOrElse(() => E.void),
      ),
    ),
    E.bind("removed", ({ currentSchema, entity }) =>
      pipe(
        O.fromNullable(entity.parentId),
        O.map((parentId) =>
          pipe(
            schemaParsing.getSchemaEntity(parentId, currentSchema.entities),
            E.map((parentEntity) =>
              R.modify(currentSchema.entities, parentId, (parent) => ({
                ...parent,
                children: A.filter(
                  parentEntity.children ?? [],
                  (id) => id !== entityId,
                ),
              })),
            ),
            E.map((entities) => ({
              entities,
              root: A.filter(currentSchema.root, (id) => id !== entityId),
            })),
          ),
        ),
        O.getOrElse(() =>
          E.succeed({
            entities: currentSchema.entities,
            root: A.filter(currentSchema.root, (id) => id !== entityId),
          }),
        ),
      ),
    ),
    E.bind("result", ({ removed, maybeNewParent }) =>
      pipe(
        O.fromNullable(maybeNewParent),
        O.map(({ id: parentId }) =>
          pipe(
            schemaParsing.getSchemaEntity(parentId, removed.entities),
            E.flatMap((parentEntity) =>
              insertAt(
                parentEntity.children
                  ? A.filter(parentEntity.children, (id) => id !== entityId)
                  : [],
                entityId,
                options?.index,
              ),
            ),
            E.map((updatedChildren) => ({
              schema: {
                entities: pipe(
                  R.modify(removed.entities, parentId, (parentEntity) => ({
                    ...parentEntity,
                    children: updatedChildren.array,
                  })),
                  (entities) =>
                    R.modify(entities, entityId, (entity) => ({
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
        O.getOrElse(() =>
          pipe(
            insertAt(removed.root, entityId, options?.index),
            E.map((updatedRoot) => ({
              schema: {
                entities: R.modify(removed.entities, entityId, (entity) =>
                  S.omit(entity, "parentId"),
                ),
                root: updatedRoot.array,
              },
              index: updatedRoot.index,
            })),
          ),
        ),
      ),
    ),
    E.tap(({ result }) =>
      E.sync(() =>
        dataStore.setState((prev) =>
          S.evolve(prev, {
            schema: () => result.schema,
          }),
        ),
      ),
    ),
    E.map(({ result }) => ({
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
): E.Effect<{ array: readonly T[]; index: number }, IndexOutOfBoundsError> {
  return pipe(
    A.insertAt(array, index, item),
    O.map((result) => E.succeed({ array: result, index })),
    O.getOrElse(() =>
      E.fail(
        new IndexOutOfBoundsError({
          index,
          arrayLength: array.length,
        }),
      ),
    ),
  );
}

function validateEntityIdUniqueness(
  entityId: string,
  entities: schemaParsing.DraftSchema["entities"],
): E.Effect<void, EntityIdAlreadyExistsError> {
  return pipe(
    E.fail(new EntityIdAlreadyExistsError({ entityId })),
    E.when(() => R.has(entities, entityId)),
  );
}

function addRawEntity(
  entityId: string,
  newEntity: schemaParsing.DraftSchemaEntity,
  schema: schemaParsing.DraftSchema,
  index?: number,
): E.Effect<
  {
    updatedSchema: schemaParsing.DraftSchema;
    index: number;
  },
  IndexOutOfBoundsError | schemaParsing.EntityNotFoundError
> {
  return pipe(R.set(schema.entities, entityId, newEntity), (entities) =>
    pipe(
      O.fromNullable(newEntity.parentId),
      O.map((parentId) =>
        pipe(
          schemaParsing.getSchemaEntity(parentId, schema.entities),
          E.flatMap((parentEntity) =>
            pipe(
              insertAt(parentEntity.children ?? [], entityId, index),
              E.map((updatedChildren) => ({
                updatedSchema: S.evolve(schema, {
                  entities: () =>
                    R.modify(entities, parentId, (parentEntity) => ({
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
      O.getOrElse(() =>
        pipe(
          insertAt(schema.root, entityId, index),
          E.map((updatedRoot) => ({
            updatedSchema: S.evolve(schema, {
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
  builder: builderDefinition.BuilderDefinition,
): E.Effect<
  string,
  schemaParsing.InvalidEntityIdError | EntityIdAlreadyExistsError
> {
  return pipe(
    E.sync(() => builder.generateEntityId()),
    E.tap((id) =>
      E.all([
        schemaParsing.validateEntityId(id, builder),
        validateEntityIdUniqueness(id, entities),
      ]),
    ),
  );
}

export function addEntity<
  TBuilder extends builderDefinition.BuilderDefinition,
  TType extends utils.KeyofStringIntersection<TBuilder["entities"]>,
>(
  [payload]: [AddEntityPayload<TBuilder, TType>],
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
  builder: TBuilder,
): AddEntityOutput<utils.EffectMode, TBuilder, TType> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("entityId", ({ currentSchema }) =>
      pipe(
        O.fromNullable(payload.id),
        O.map((id) =>
          pipe(
            E.succeed(id),
            E.tap((id) => schemaParsing.validateEntityId(id, builder)),
            E.tap((id) =>
              validateEntityIdUniqueness(id, currentSchema.entities),
            ),
          ),
        ),
        O.getOrElse(() => generateEntityId(currentSchema.entities, builder)),
      ),
    ),
    E.tap(({ currentSchema }) =>
      E.all([
        schemaParsing.validateEntityConstraints(
          {
            entityType: payload.type,
            attributes: payload.attributes ?? {},
            parentId: payload.parentId,
            entities: currentSchema.entities,
          },
          builder,
        ),
      ]),
    ),
    E.bind("parsedAttributes", () =>
      pipe(
        schemaParsing.parseEntityAttributes(
          payload.type,
          schemaParsing.computeEntityAttributesWithDefaults(
            payload.attributes ?? {},
            payload.type,
            builder,
          ),
          builder,
        ),
        (result) =>
          E.if(R.isEmptyRecord(result.errors), {
            onTrue: () => E.succeed(result.values),
            onFalse: () =>
              E.fail(
                new schemaParsing.EntityAttributesParseError({
                  errors: result.errors,
                }),
              ),
          }),
      ),
    ),
    E.bind("newEntity", ({ parsedAttributes }) =>
      pipe(payload, S.omit("index"), S.omit("id"), (computedPayload) =>
        E.succeed({
          ...computedPayload,
          attributes: parsedAttributes,
        }),
      ),
    ),
    E.bind("result", ({ currentSchema, entityId, newEntity }) =>
      addRawEntity(entityId, newEntity, currentSchema, payload.index),
    ),
    E.tap(({ result }) =>
      E.sync(() =>
        dataStore.setState((prev) =>
          S.evolve(prev, {
            schema: () => result.updatedSchema,
          }),
        ),
      ),
    ),
    E.map(({ newEntity, entityId, result }) => ({
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
    E.sync(() => dataStore.state.schema.entities),
    E.flatMap((entities) => schemaParsing.getSchemaEntity(entityId, entities)),
    E.map((entity) => ({
      ...entity,
      id: entityId,
    })),
  );
}

export function cloneEntity(
  [entityId, options]: Parameters<GenericBuilderStore["cloneEntity"]>,
  dataStore: DataStore<BuilderStoreData>,
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["cloneEntity"]> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("source", ({ currentSchema }) =>
      schemaParsing.getSchemaEntity(entityId, currentSchema.entities),
    ),
    E.bind("descendants", ({ currentSchema }) =>
      collectEntityDescendants(entityId, currentSchema),
    ),
    E.bind("targetIndex", ({ currentSchema, source }) =>
      pipe(
        O.fromNullable(options?.index),
        O.map((index) => E.succeed(index)),
        O.getOrElse(() =>
          pipe(
            O.fromNullable(source.parentId),
            O.map((parentId) =>
              pipe(
                schemaParsing.getSchemaEntity(parentId, currentSchema.entities),
                E.map((parent) =>
                  pipe(parent.children ?? [], (kids) =>
                    pipe(
                      A.findFirstIndex(kids, (id) => id === entityId),
                      O.map((i) => i + 1),
                      O.getOrElse(() => kids.length),
                    ),
                  ),
                ),
              ),
            ),
            O.getOrElse(() =>
              pipe(
                A.findFirstIndex(currentSchema.root, (id) => id === entityId),
                O.map((i) => i + 1),
                O.getOrElse(() => currentSchema.root.length),
                (index) => E.succeed(index),
              ),
            ),
          ),
        ),
      ),
    ),
    E.bind("rootCloneId", ({ currentSchema }) =>
      generateEntityId(currentSchema.entities, builder),
    ),
    E.bind("rootClone", ({ currentSchema, source, targetIndex, rootCloneId }) =>
      pipe(
        source,
        S.evolve({
          attributes: (attributes) => ({ ...attributes }),
        }),
        S.omit("children"),
        (clonedEntity) =>
          addRawEntity(rootCloneId, clonedEntity, currentSchema, targetIndex),
      ),
    ),
    E.bind("folded", ({ currentSchema, descendants, rootClone, rootCloneId }) =>
      pipe(
        descendants,
        E.reduce(
          {
            schema: rootClone.updatedSchema,
            idMap: R.set({}, entityId, rootCloneId),
          },
          (acc, originalChildId) =>
            pipe(
              generateEntityId(acc.schema.entities, builder),
              E.flatMap((childCloneId) =>
                pipe(
                  schemaParsing.getSchemaEntity(
                    originalChildId,
                    currentSchema.entities,
                  ),
                  E.map((origChild) =>
                    pipe(
                      {
                        type: origChild.type,
                        attributes: { ...origChild.attributes },
                      },
                      (baseEntity) =>
                        pipe(
                          O.fromNullable(origChild.parentId),
                          O.flatMap((oldPid) =>
                            O.fromNullable(acc.idMap[oldPid]),
                          ),
                          O.map((newPid) => ({
                            ...baseEntity,
                            parentId: newPid,
                          })),
                          O.getOrElse(() => baseEntity),
                        ),
                    ),
                  ),
                  E.flatMap((clonedChild) =>
                    addRawEntity(childCloneId, clonedChild, acc.schema),
                  ),
                  E.map((result) => ({
                    schema: result.updatedSchema,
                    idMap: R.set(acc.idMap, originalChildId, childCloneId),
                  })),
                ),
              ),
            ),
        ),
      ),
    ),
    E.tap(({ folded }) =>
      E.sync(() =>
        dataStore.setState((s) =>
          S.evolve(s, {
            schema: () => folded.schema,
          }),
        ),
      ),
    ),
    E.map(({ rootClone, rootCloneId }) => ({
      entityId,
      clonedEntityId: rootCloneId,
      index: rootClone.index,
    })),
  );
}

function parsePartialBuilderStoreData(
  builder: builderDefinition.BuilderDefinition,
  partialData?: Partial<BuilderStoreData>,
): E.Effect<
  BuilderStoreData,
  schemaParsing.SchemaParseError | EntitiesAttributesErrorsParseError
> {
  return pipe(
    O.fromNullable(partialData?.schema),
    O.map((schema) =>
      schemaParsing.parseDraftSchemaEffectfully(schema, builder),
    ),
    O.getOrElse(() =>
      E.succeed<schemaParsing.DraftSchema>({
        entities: {},
        root: [],
      }),
    ),
    E.flatMap((parsedSchema) =>
      pipe(
        O.fromNullable(partialData?.entitiesAttributesErrors),
        O.map((attributeErrors) =>
          parseEntitiesAttributesErrors(attributeErrors, parsedSchema, builder),
        ),
        O.getOrElse(() => E.succeed({})),
        E.map((entitiesAttributesErrors) => ({
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
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["setData"]> {
  return pipe(
    parsePartialBuilderStoreData(builder, data),
    E.tap((parsedData) => E.sync(() => dataStore.setState(parsedData))),
    E.map((parsedData) => parsedData),
  );
}

function getEntityDefinition(
  entityType: string,
  builder: builderDefinition.BuilderDefinition,
): E.Effect<entityDefinition.EntityDefinition> {
  return pipe(
    O.fromNullable(builder.entities[entityType]),
    O.map((entityDefinition) => E.succeed(entityDefinition)),
    O.getOrElse(() =>
      E.dieMessage(
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
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["setEntityAttributeValue"]> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("entity", ({ currentSchema }) =>
      schemaParsing.getSchemaEntity(entityId, currentSchema.entities),
    ),
    E.bind("attributeDefinition", ({ entity }) =>
      pipe(
        getEntityDefinition(entity.type, builder),
        E.flatMap((entityDefinition) =>
          schemaParsing.getAttributeDefinition(
            entity.type,
            entityDefinition,
            attributeName,
          ),
        ),
      ),
    ),
    E.bind("valueParseResult", ({ attributeDefinition }) =>
      E.succeed(
        schemaParsing.parseEntityAttribute(
          attributeName,
          attributeValue,
          attributeDefinition,
        ),
      ),
    ),
    E.flatMap(({ valueParseResult, entity }) =>
      Ei.match(valueParseResult, {
        onLeft: (error) =>
          E.fail(
            new schemaParsing.EntityAttributeParseError({
              entityId,
              entityType: entity.type,
              attributeName,
              cause: error,
            }),
          ),
        onRight: (value) =>
          pipe(
            E.sync(() =>
              dataStore.setState((prevState) =>
                S.evolve(prevState, {
                  schema: (schema) =>
                    S.evolve(schema, {
                      entities: (entities) =>
                        R.modify(entities, entityId, (existingEntity) =>
                          S.evolve(existingEntity, {
                            attributes: (attributes) =>
                              R.set(attributes, attributeName, value),
                          }),
                        ),
                    }),
                }),
              ),
            ),
            E.flatMap(() =>
              E.succeed({
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
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["resetEntityAttributeValue"]> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("entity", ({ currentSchema }) =>
      schemaParsing.getSchemaEntity(entityId, currentSchema.entities),
    ),
    E.bind("attributeDefinition", ({ entity }) =>
      pipe(
        getEntityDefinition(entity.type, builder),
        E.flatMap((entityDefinition) =>
          schemaParsing.getAttributeDefinition(
            entity.type,
            entityDefinition,
            attributeName,
          ),
        ),
      ),
    ),
    E.flatMap(({ attributeDefinition }) =>
      pipe(
        O.fromNullable(
          attributeDefinition.defaultValue?.bind(attributeDefinition),
        ),
        O.map((defaultValueFn) =>
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
        O.getOrElse(() =>
          pipe(
            clearEntityAttributeValue(
              [entityId, attributeName],
              dataStore,
              builder,
            ),
            E.map(() => ({
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
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["clearEntityAttributeValue"]> {
  return pipe(
    E.sync(() => dataStore.state.schema.entities),
    E.flatMap((entities) => schemaParsing.getSchemaEntity(entityId, entities)),
    E.tap((entity) =>
      schemaParsing.validateEntityAttributeName(
        entity.type,
        attributeName,
        builder,
      ),
    ),
    E.tap((entity) =>
      E.sync(() =>
        dataStore.setState((prevState) =>
          S.evolve(prevState, {
            schema: (schema) =>
              S.evolve(schema, {
                entities: (entities) =>
                  R.set(
                    entities,
                    entityId,
                    S.evolve(entity, {
                      attributes: (attributes) =>
                        R.remove(attributes, attributeName),
                    }),
                  ),
              }),
          }),
        ),
      ),
    ),
    E.flatMap(() => E.succeed({ entityId, attributeName })),
  );
}

export function clearEntityAttributesValues(
  [entityId]: Parameters<GenericBuilderStore["clearEntityAttributesValues"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["clearEntityAttributesValues"]> {
  return pipe(
    E.sync(() => dataStore.state.schema.entities),
    E.flatMap((entities) => schemaParsing.getSchemaEntity(entityId, entities)),
    E.tap((entity) =>
      E.sync(() =>
        dataStore.setState((prevState) =>
          S.evolve(prevState, {
            schema: (schema) =>
              S.evolve(schema, {
                entities: (entities) =>
                  R.set(
                    entities,
                    entityId,
                    S.evolve(entity, { attributes: () => ({}) }),
                  ),
              }),
          }),
        ),
      ),
    ),
    E.flatMap(() => E.succeed({ entityId })),
  );
}

export function clearEntityAttributeError(
  [entityId, attributeName]: Parameters<
    GenericBuilderStore["clearEntityAttributeError"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["clearEntityAttributeError"]> {
  return pipe(
    E.sync(() => dataStore.state.schema.entities),
    E.flatMap((entities) => schemaParsing.getSchemaEntity(entityId, entities)),
    E.tap((entity) =>
      schemaParsing.validateEntityAttributeName(
        entity.type,
        attributeName,
        builder,
      ),
    ),
    E.tap(() =>
      E.sync(() =>
        dataStore.setState((prevState) =>
          S.evolve(prevState, {
            entitiesAttributesErrors: (errors) =>
              schemaValidation.cleanEntitiesAttributeErrors(
                R.set(
                  errors,
                  entityId,
                  R.remove(errors[entityId] ?? {}, attributeName),
                ),
              ),
          }),
        ),
      ),
    ),
    E.flatMap(() => E.succeed({ entityId, attributeName })),
  );
}

export function clearEntityAttributesErrors(
  [entityId]: Parameters<GenericBuilderStore["clearEntityAttributesErrors"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["clearEntityAttributesErrors"]> {
  return pipe(
    E.sync(() => dataStore.state.schema.entities),
    E.tap((entities) =>
      schemaParsing.validateEntityIdExistance(entityId, entities),
    ),
    E.tap(() =>
      E.sync(() =>
        dataStore.setState((prevState) =>
          S.evolve(prevState, {
            entitiesAttributesErrors: (errors) =>
              schemaValidation.cleanEntitiesAttributeErrors(
                R.remove(errors, entityId),
              ),
          }),
        ),
      ),
    ),
    E.flatMap(() => E.succeed({ entityId })),
  );
}

export function clearEntitiesAttributesErrors(
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["clearEntitiesAttributesErrors"]> {
  return pipe(
    E.sync(() =>
      dataStore.setState((prevState) =>
        S.evolve(prevState, {
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
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["validateEntityAttribute"]> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("entity", ({ currentSchema }) =>
      schemaParsing.getSchemaEntity(entityId, currentSchema.entities),
    ),
    E.bind("attributeDefinition", ({ entity }) =>
      pipe(
        getEntityDefinition(entity.type, builder),
        E.flatMap((entityDefinition) =>
          schemaParsing.getAttributeDefinition(
            entity.type,
            entityDefinition,
            attributeName,
          ),
        ),
      ),
    ),
    E.bind(
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
    E.flatMap(({ validatedValueResult, entity }) =>
      Ei.match(validatedValueResult, {
        onLeft: (error) =>
          pipe(
            E.sync(() =>
              dataStore.setState((prevState) =>
                S.evolve(prevState, {
                  entitiesAttributesErrors: (entitiesAttributesErrors) =>
                    schemaValidation.cleanEntitiesAttributeErrors(
                      R.set(
                        entitiesAttributesErrors,
                        entityId,
                        R.set(
                          entitiesAttributesErrors[entityId] ?? {},
                          attributeName,
                          error,
                        ),
                      ),
                    ),
                }),
              ),
            ),
            E.flatMap(() =>
              E.fail(
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
            E.sync(() =>
              dataStore.setState((prevState) =>
                S.evolve(prevState, {
                  schema: (schema) =>
                    S.evolve(schema, {
                      entities: (entities) =>
                        R.modify(entities, entityId, (existingEntity) =>
                          S.evolve(existingEntity, {
                            attributes: (attributes) =>
                              R.set(attributes, attributeName, value),
                          }),
                        ),
                    }),
                  entitiesAttributesErrors: (entitiesAttributesErrors) =>
                    schemaValidation.cleanEntitiesAttributeErrors(
                      R.set(
                        entitiesAttributesErrors,
                        entityId,
                        R.remove(
                          entitiesAttributesErrors[entityId] ?? {},
                          attributeName,
                        ),
                      ),
                    ),
                }),
              ),
            ),
            E.flatMap(() =>
              E.succeed({
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
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["validateEntityAttributes"]> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("entity", ({ currentSchema }) =>
      schemaParsing.getSchemaEntity(entityId, currentSchema.entities),
    ),
    E.bind("validatedAttributes", ({ entity, currentSchema }) =>
      schemaValidation.validateEntityAttributes(
        entityId,
        entity,
        currentSchema,
        builder,
      ),
    ),
    E.flatMap(({ validatedAttributes, currentSchema }) =>
      pipe(
        E.succeed({
          ...currentSchema.entities[entityId]?.attributes,
          ...validatedAttributes.values,
        }),
        E.tap((attributes) =>
          E.sync(() =>
            dataStore.setState((prevState) =>
              S.evolve(prevState, {
                schema: (schema) =>
                  S.evolve(schema, {
                    entities: (entities) =>
                      R.modify(entities, entityId, (existingEntity) =>
                        S.evolve(existingEntity, {
                          attributes: () => attributes,
                        }),
                      ),
                  }),
                entitiesAttributesErrors: (errors) =>
                  schemaValidation.cleanEntitiesAttributeErrors(
                    R.set(errors, entityId, validatedAttributes.errors),
                  ),
              }),
            ),
          ),
        ),
        E.flatMap((attributes) =>
          E.if(R.isEmptyRecord(validatedAttributes.errors), {
            onTrue: () => E.succeed({ entityId, attributes }),
            onFalse: () =>
              E.fail(
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
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["validateEntitiesAttributes"]> {
  return pipe(
    E.Do,
    E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
    E.bind("validationResult", ({ currentSchema }) =>
      schemaValidation.validateEntitiesAttributes(currentSchema, builder),
    ),
    E.flatMap(({ validationResult, currentSchema }) =>
      pipe(
        E.sync(() =>
          dataStore.setState((prevState) =>
            S.evolve(prevState, {
              schema: (schema) =>
                S.evolve(schema, {
                  entities: () => validationResult.entities,
                }),
              entitiesAttributesErrors: () =>
                schemaValidation.cleanEntitiesAttributeErrors(
                  validationResult.attributeErrors,
                ),
            }),
          ),
        ),
        E.flatMap(() =>
          E.if(R.isEmptyRecord(validationResult.attributeErrors), {
            onTrue: () =>
              E.succeed({
                schema: S.evolve(currentSchema, {
                  entities: () => validationResult.entities,
                }),
              }),
            onFalse: () =>
              E.fail(
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

export function validateSchema<
  TBuilder extends builderDefinition.BuilderDefinition,
>(
  dataStore: DataStore<BuilderStoreData>,
  builder: TBuilder,
): ValidateSchemaOutput<utils.EffectMode, TBuilder> {
  return pipe(
    validateEntitiesAttributes(dataStore, builder),
    E.flatMap(({ schema }) =>
      schemaValidation.refineSchema(
        schema as schemaParsing.ParsedSchema<TBuilder>,
        builder,
      ),
    ),
    E.tap(() =>
      E.sync(() =>
        dataStore.setState((prevState) => S.omit(prevState, "schemaError")),
      ),
    ),
    E.tapErrorTag("SchemaRefineError", (error) =>
      E.sync(() =>
        dataStore.setState((prevState) => ({
          ...prevState,
          schemaError: error.cause,
        })),
      ),
    ),
    E.map((refinedSchema) => ({
      schema: refinedSchema,
    })),
  );
}

export function setEntityAttributeError(
  [entityId, attributeName, attributeError]: Parameters<
    GenericBuilderStore["setEntityAttributeError"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["setEntityAttributeError"]> {
  return pipe(
    E.sync(() => dataStore.state.schema.entities),
    E.flatMap((entities) => schemaParsing.getSchemaEntity(entityId, entities)),
    E.tap((entity) =>
      schemaParsing.validateEntityAttributeName(
        entity.type,
        attributeName,
        builder,
      ),
    ),
    E.tap(() =>
      E.sync(() =>
        dataStore.setState((prevState) =>
          S.evolve(prevState, {
            entitiesAttributesErrors: (prevErrors) =>
              schemaValidation.cleanEntitiesAttributeErrors(
                R.set(
                  prevErrors,
                  entityId,
                  R.set(
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
    E.map(() => ({ entityId, attributeName, attributeError })),
  );
}

export function setEntityAttributesErrors(
  [entityId, attributesErrors]: Parameters<
    GenericBuilderStore["setEntityAttributesErrors"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["setEntityAttributesErrors"]> {
  return pipe(
    E.sync(() => dataStore.state.schema.entities),
    E.flatMap((entities) => schemaParsing.getSchemaEntity(entityId, entities)),
    E.tap((entity) =>
      schemaParsing.validateEntityAttributeNames(
        entity.type,
        R.keys(attributesErrors),
        builder,
      ),
    ),
    E.tap(() =>
      E.sync(() =>
        dataStore.setState((prevState) =>
          S.evolve(prevState, {
            entitiesAttributesErrors: (prevErrors) =>
              schemaValidation.cleanEntitiesAttributeErrors(
                R.set(prevErrors, entityId, attributesErrors),
              ),
          }),
        ),
      ),
    ),
    E.map(() => ({ entityId, attributesErrors })),
  );
}

export function setEntitiesAttributesErrors(
  [entitiesAttributesErrors]: Parameters<
    GenericBuilderStore["setEntitiesAttributesErrors"]
  >,
  dataStore: DataStore<BuilderStoreData>,
  builder: builderDefinition.BuilderDefinition,
): ReturnType<GenericBuilderStore["setEntitiesAttributesErrors"]> {
  return pipe(
    E.sync(() => dataStore.state.schema),
    E.flatMap((schema) =>
      parseEntitiesAttributesErrors(entitiesAttributesErrors, schema, builder),
    ),
    E.tap(() =>
      E.sync(() =>
        dataStore.setState((prevState) =>
          S.evolve(prevState, {
            entitiesAttributesErrors: () => entitiesAttributesErrors,
          }),
        ),
      ),
    ),
    E.map(() => ({ attributesErrors: entitiesAttributesErrors })),
  );
}

export function setSchemaError(
  [schemaError]: Parameters<GenericBuilderStore["setSchemaError"]>,
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["setSchemaError"]> {
  return pipe(
    E.sync(() =>
      dataStore.setState((prevState) => ({
        ...prevState,
        schemaError,
      })),
    ),
    E.map(() => ({ schemaError })),
  );
}

export function clearSchemaError(
  dataStore: DataStore<BuilderStoreData>,
): ReturnType<GenericBuilderStore["clearSchemaError"]> {
  return E.sync(() =>
    dataStore.setState((prevState) => S.omit(prevState, "schemaError")),
  );
}

export function createEffectfulBuilderStore<
  TBuilder extends builderDefinition.BuilderDefinition,
>(
  builder: TBuilder,
  options?: CreateBuilderStoreOptions<TBuilder>,
): E.Effect<EffectfulBuilderStore<TBuilder>, CreateBuilderStoreError> {
  return pipe(
    parsePartialBuilderStoreData(builder, options?.initialData),
    E.map((builderStoreData) =>
      pipe(
        new DataStore<BuilderStoreData<TBuilder>>(builderStoreData),
        (dataStore): EffectfulBuilderStore<TBuilder> => ({
          ...utils.makeGenericStore(builder, dataStore),
          addEntity: (...args) => addEntity(args, dataStore, builder),
          getEntity: (...args) => getEntity(args, dataStore),
          getEntityIndex: (...args) => getEntityIndex(args, dataStore),
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
        }),
      ),
    ),
  );
}

export function createBuilderStore<
  TBuilder extends builderDefinition.BuilderDefinition,
>(
  builder: TBuilder,
  options?: CreateBuilderStoreOptions<TBuilder>,
): utils.Result<BuilderStore<TBuilder>, CreateBuilderStoreError> {
  return E.runSync(
    utils.flatMapAsResult(
      pipe(
        createEffectfulBuilderStore(builder, options),
        E.map(
          (builderStore): BuilderStore<TBuilder> => ({
            ...builderStore,
            addEntity: (...args) =>
              utils.runSyncAsResult(builderStore.addEntity(...args)),
            getEntity: (...args) =>
              utils.runSyncAsResult(builderStore.getEntity(...args)),
            getEntityIndex: (...args) =>
              utils.runSyncAsResult(builderStore.getEntityIndex(...args)),
            cloneEntity: (...args) =>
              utils.runSyncAsResult(builderStore.cloneEntity(...args)),
            removeEntity: (...args) =>
              utils.runSyncAsResult(builderStore.removeEntity(...args)),
            setEntityIndex: (...args) =>
              utils.runSyncAsResult(builderStore.setEntityIndex(...args)),
            setEntityParent: (...args) =>
              utils.runSyncAsResult(builderStore.setEntityParent(...args)),
            setEntityAttributeValue: (...args) =>
              utils.runSyncAsResult(
                builderStore.setEntityAttributeValue(...args),
              ),
            resetEntityAttributeValue: (...args) =>
              utils.runSyncAsResult(
                builderStore.resetEntityAttributeValue(...args),
              ),
            clearEntityAttributeValue: (...args) =>
              utils.runSyncAsResult(
                builderStore.clearEntityAttributeValue(...args),
              ),
            clearEntityAttributesValues: (...args) =>
              utils.runSyncAsResult(
                builderStore.clearEntityAttributesValues(...args),
              ),
            validateEntityAttribute: (...args) =>
              utils.runPromiseAsResult(
                builderStore.validateEntityAttribute(...args),
              ),
            validateEntityAttributes: (...args) =>
              utils.runPromiseAsResult(
                builderStore.validateEntityAttributes(...args),
              ),
            validateEntitiesAttributes: () =>
              utils.runPromiseAsResult(
                builderStore.validateEntitiesAttributes(),
              ),
            clearEntityAttributeError: (...args) =>
              utils.runSyncAsResult(
                builderStore.clearEntityAttributeError(...args),
              ),
            clearEntityAttributesErrors: (...args) =>
              utils.runSyncAsResult(
                builderStore.clearEntityAttributesErrors(...args),
              ),
            clearEntitiesAttributesErrors: () =>
              utils.runSyncAsResult(
                builderStore.clearEntitiesAttributesErrors(),
              ),
            setEntityAttributeError: (...args) =>
              utils.runSyncAsResult(
                builderStore.setEntityAttributeError(...args),
              ),
            setEntityAttributesErrors: (...args) =>
              utils.runSyncAsResult(
                builderStore.setEntityAttributesErrors(...args),
              ),
            setEntitiesAttributesErrors: (...args) =>
              utils.runSyncAsResult(
                builderStore.setEntitiesAttributesErrors(...args),
              ),
            validateSchema: () =>
              utils.runPromiseAsResult(builderStore.validateSchema()),
            setData: (...args) =>
              utils.runSyncAsResult(builderStore.setData(...args)),
            setSchemaError: (...args) =>
              utils.runSyncAsResult(builderStore.setSchemaError(...args)),
            clearSchemaError: () =>
              utils.runSyncAsResult(builderStore.clearSchemaError()),
          }),
        ),
      ),
    ),
  );
}
