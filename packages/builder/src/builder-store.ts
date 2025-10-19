import { Store as DataStore } from "@tanstack/store";
import * as A from "effect/Array";
import * as C from "effect/Cause";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as M from "effect/Match";
import * as O from "effect/Option";
import * as R from "effect/Record";
import * as S from "effect/Struct";

import {
  type InferAttributeDefinitionError,
  type InferAttributeDefinitionParsedValue,
} from "./attribute-definition";
import {
  getEntityDefinitionDangerously,
  type Builder,
  type InferBuilderSchemaRefineError,
} from "./builder";
import {
  makeGenericStore,
  type EffectMode,
  type GenericStore,
  type ModeAsyncOutput,
  type ModeOutput,
  type ResultMode,
} from "./generic-store";
import {
  collectEntityDescendants,
  computeEntityAttributesWithDefaults,
  EntityAttributeParseError,
  EntityAttributesParseError,
  getAttributeDefinition,
  getSchemaEntityById,
  getSchemaEntityByRef,
  parseDraftSchemaEffectfully,
  parseEntityAttribute,
  parseEntityAttributes,
  validateEntityAttributeName,
  validateEntityAttributeNames,
  validateEntityChildrenAllowed,
  validateEntityConstraints,
  validateEntityId,
  validateEntityParentAllowed,
  validateParentRequired,
  validateSchemaEntityRef,
  type ChildNotAllowedError,
  type DraftSchema,
  type DraftSchemaEntity,
  type EntitiesAttributesParseErrors,
  type EntityRefTypeMismatchError,
  type InvalidAttributeNameError,
  type InvalidEntityIdError,
  type InvalidEntityTypeError,
  type ParentNotAllowedError,
  type ParentRequiredError,
  type ParsedSchema,
  type ParsedSchemaEntity,
  type ParseSchemaError,
  type ReferencedEntityNotFoundError,
} from "./schema-parsing";
import {
  EntitiesAttributesValidationError,
  EntityAttributesValidationError,
  EntityAttributeValidationError,
  refineSchema,
  validateEntitiesAttributes,
  validateEntityAttribute,
  validateEntityAttributes,
  type EntitiesAttributesValidationErrors,
  type EntityAttributesValidationErrors,
  type SchemaRefineError,
} from "./schema-validation";
import {
  createAttributeRef,
  createEntityRef,
  filterEmptyRecords,
  flatMapAsResult,
  runPromiseAsResult,
  runSyncAsResult,
  type AttributeRef,
  type EntityRef,
  type KeyofStringIntersection,
  type Result,
} from "./utils";

export interface BuilderStoreData<TBuilder extends Builder = Builder> {
  readonly schema: DraftSchema<TBuilder>;
  readonly errors: {
    readonly schema?: InferBuilderSchemaRefineError<TBuilder>;
    readonly attributes: EntitiesAttributesValidationErrors<TBuilder>;
  };
}

interface PartialBuilderStoreData<TBuilder extends Builder>
  extends Omit<Partial<BuilderStoreData<TBuilder>>, "errors"> {
  readonly errors?: {
    readonly schema?: BuilderStoreData<TBuilder>["errors"]["schema"];
    readonly attributes?:
      | EntitiesAttributesValidationErrors<TBuilder>
      | EntitiesAttributesParseErrors<TBuilder>;
  };
}

interface GenericBuilderStore<
  TBuilder extends Builder = Builder,
  TResultMode = EffectMode,
> extends GenericStore<TBuilder, BuilderStoreData<TBuilder>> {
  readonly addEntity: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    payload: Omit<
      DraftSchemaEntity<TBuilder, TType>,
      "children" | "attributes"
    > & {
      id?: string;
      index?: number;
      attributes?: DraftSchemaEntity<TBuilder, TType>["attributes"];
    },
  ) => ModeOutput<
    TResultMode,
    {
      readonly entity: DraftSchemaEntity<TBuilder, TType> & {
        readonly id: string;
        readonly ref: EntityRef<TBuilder, TType>;
      };
      readonly index: number;
    },
    | IndexOutOfBoundsError
    | EntityIdAlreadyExistsError<TBuilder>
    | EntityAttributesParseError<TBuilder, TType>
    | InvalidEntityIdError
    | InvalidEntityTypeError<TBuilder>
    | ParentRequiredError<TBuilder>
    | InvalidAttributeNameError<TBuilder, TType>
    | ReferencedEntityNotFoundError
    | ChildNotAllowedError<TBuilder>
    | ParentNotAllowedError<TBuilder>
  >;
  readonly getEntity: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    entityRef: EntityRef<TBuilder, TType>,
  ) => ModeOutput<
    TResultMode,
    {
      readonly ref: EntityRef<TBuilder, TType>;
      readonly id: string;
      readonly attributes: {
        readonly [K in KeyofStringIntersection<
          TBuilder["entities"][TType]["attributes"]
        >]: {
          value:
            | InferAttributeDefinitionParsedValue<
                TBuilder["entities"][TType]["attributes"][K]
              >
            | undefined;
          ref: AttributeRef<TBuilder, TType, K>;
        };
      };
      readonly type: TType;
      readonly parentId?: Readonly<string>;
      readonly children?: ReadonlyArray<string>;
    },
    ReferencedEntityNotFoundError | EntityRefTypeMismatchError
  >;
  readonly getEntityIndex: (
    entityRef: EntityRef<TBuilder>,
  ) => ModeOutput<
    TResultMode,
    number,
    ReferencedEntityNotFoundError | EntityRefTypeMismatchError
  >;
  readonly cloneEntity: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    entityRef: EntityRef<TBuilder, TType>,
    options?: { index?: number },
  ) => ModeOutput<
    TResultMode,
    {
      sourceEntityRef: EntityRef<TBuilder, TType>;
      clonedEntityRef: EntityRef<TBuilder, TType>;
      index: number;
    },
    | IndexOutOfBoundsError
    | EntityIdAlreadyExistsError<TBuilder>
    | InvalidEntityIdError
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
  >;
  readonly removeEntity: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    entityRef: EntityRef<TBuilder, TType>,
  ) => ModeOutput<
    TResultMode,
    { readonly removedEntityRefs: ReadonlyArray<EntityRef<TBuilder>> },
    ReferencedEntityNotFoundError | EntityRefTypeMismatchError
  >;
  readonly setEntityIndex: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    entityRef: EntityRef<TBuilder, TType>,
    index: number | ((currentIndex: number) => number),
  ) => ModeOutput<
    TResultMode,
    { entityRef: EntityRef<TBuilder, TType>; index: number },
    | IndexOutOfBoundsError
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
  >;
  readonly setEntityParent: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
    TParentRef extends EntityRef<TBuilder> | undefined =
      | EntityRef<TBuilder>
      | undefined,
  >(
    entityRef: EntityRef<TBuilder, TType>,
    parentRef: TParentRef,
    options?: { index?: number },
  ) => ModeOutput<
    TResultMode,
    {
      entityRef: EntityRef<TBuilder, TType>;
      parentRef: TParentRef;
      index: number;
    },
    | IndexOutOfBoundsError
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | ParentNotAllowedError<TBuilder>
    | ChildNotAllowedError<TBuilder>
    | ParentRequiredError<TBuilder>
  >;
  readonly setData: (
    data: BuilderStoreData<TBuilder>,
  ) => ModeOutput<
    TResultMode,
    BuilderStoreData<TBuilder>,
    ParseSchemaError<TBuilder> | EntitiesAttributesErrorsParseError<TBuilder>
  >;
  readonly setEntityAttributeValue: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
    TAttributeName extends KeyofStringIntersection<
      TBuilder["entities"][TType]["attributes"]
    >,
  >(
    attributeRef: AttributeRef<TBuilder, TType, TAttributeName>,
    attributeValue: InferAttributeDefinitionParsedValue<
      TBuilder["entities"][TType]["attributes"][TAttributeName]
    >,
  ) => ModeOutput<
    TResultMode,
    {
      attributeRef: AttributeRef<TBuilder, TType, TAttributeName>;
      attributeValue: unknown;
    },
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | InvalidAttributeNameError<TBuilder, TType>
    | EntityAttributeParseError<TBuilder, TType, TAttributeName>
  >;
  readonly setEntityAttributesValues: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    entityRef: EntityRef<TBuilder, TType>,
    attributesValues: DraftSchemaEntity<TBuilder, TType>["attributes"],
  ) => ModeOutput<
    TResultMode,
    {
      entityRef: EntityRef<TBuilder, TType>;
    },
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | InvalidAttributeNameError<TBuilder, TType>
    | EntityAttributesParseError<TBuilder, TType>
  >;
  readonly clearEntityAttributeValue: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
    TAttributeName extends KeyofStringIntersection<
      TBuilder["entities"][TType]["attributes"]
    >,
  >(
    attributeRef: AttributeRef<TBuilder, TType, TAttributeName>,
  ) => ModeOutput<
    TResultMode,
    {
      attributeRef: AttributeRef<TBuilder, TType, TAttributeName>;
    },
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | InvalidAttributeNameError<TBuilder, TType>
  >;
  readonly clearEntityAttributesValues: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    entityRef: EntityRef<TBuilder, TType>,
  ) => ModeOutput<
    TResultMode,
    {
      entityRef: EntityRef<TBuilder, TType>;
    },
    ReferencedEntityNotFoundError | EntityRefTypeMismatchError
  >;
  readonly resetEntityAttributeValue: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
    TAttributeName extends KeyofStringIntersection<
      TBuilder["entities"][TType]["attributes"]
    >,
  >(
    attributeRef: AttributeRef<TBuilder, TType, TAttributeName>,
  ) => ModeOutput<
    TResultMode,
    {
      attributeRef: AttributeRef<TBuilder, TType, TAttributeName>;
      attributeValue:
        | InferAttributeDefinitionParsedValue<
            TBuilder["entities"][TType]["attributes"][TAttributeName]
          >
        | undefined;
    },
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | InvalidAttributeNameError<TBuilder, TType>
    | EntityAttributeParseError<TBuilder, TType, TAttributeName>
  >;
  readonly clearEntityAttributeError: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
    TAttributeName extends KeyofStringIntersection<
      TBuilder["entities"][TType]["attributes"]
    >,
  >(
    attributeRef: AttributeRef<TBuilder, TType, TAttributeName>,
  ) => ModeOutput<
    TResultMode,
    {
      attributeRef: AttributeRef<TBuilder, TType, TAttributeName>;
    },
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | InvalidAttributeNameError<TBuilder, TType>
  >;
  readonly clearEntityAttributesErrors: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    entityRef: EntityRef<TBuilder, TType>,
  ) => ModeOutput<
    TResultMode,
    {
      entityRef: EntityRef<TBuilder, TType>;
    },
    ReferencedEntityNotFoundError | EntityRefTypeMismatchError
  >;
  readonly clearEntitiesAttributesErrors: () => ModeOutput<TResultMode>;
  readonly validateEntityAttribute: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
    TAttributeName extends KeyofStringIntersection<
      TBuilder["entities"][TType]["attributes"]
    >,
  >(
    attributeRef: AttributeRef<TBuilder, TType, TAttributeName>,
  ) => ModeAsyncOutput<
    TResultMode,
    {
      attributeRef: AttributeRef<TBuilder, TType, TAttributeName>;
      attributeValue: unknown;
    },
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | InvalidAttributeNameError<TBuilder, TType>
    | EntityAttributeValidationError<TBuilder>
  >;
  readonly validateEntityAttributes: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    entityRef: EntityRef<TBuilder, TType>,
  ) => ModeAsyncOutput<
    TResultMode,
    {
      entityRef: EntityRef<TBuilder, TType>;
      attributes: ParsedSchemaEntity<TBuilder, TType>["attributes"];
    },
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | EntityAttributesValidationError<TBuilder>
  >;
  readonly validateEntitiesAttributes: () => ModeAsyncOutput<
    TResultMode,
    {
      schema: DraftSchema<TBuilder>;
    },
    EntitiesAttributesValidationError<TBuilder>
  >;
  readonly setEntityAttributeError: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
    TAttributeName extends KeyofStringIntersection<
      TBuilder["entities"][TType]["attributes"]
    >,
  >(
    attributeRef: AttributeRef<TBuilder, TType, TAttributeName>,
    error: InferAttributeDefinitionError<
      TBuilder["entities"][TType]["attributes"][TAttributeName]
    >,
  ) => ModeOutput<
    TResultMode,
    {
      entityRef: EntityRef<TBuilder, TType>;
      attributeName: TAttributeName;
      attributeError: unknown;
    },
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | InvalidAttributeNameError<TBuilder, TType>
  >;
  readonly setEntityAttributesErrors: <
    TType extends KeyofStringIntersection<TBuilder["entities"]>,
  >(
    entityRef: EntityRef<TBuilder, TType>,
    attributesErrors: EntityAttributesValidationErrors<TBuilder, TType>,
  ) => ModeOutput<
    TResultMode,
    {
      entityRef: EntityRef<TBuilder, TType>;
      attributesErrors: EntityAttributesValidationErrors<TBuilder, TType>;
    },
    | ReferencedEntityNotFoundError
    | EntityRefTypeMismatchError
    | InvalidAttributeNameError<TBuilder, TType>
  >;
  readonly setEntitiesAttributesErrors: (
    attributesErrors:
      | EntitiesAttributesValidationErrors<TBuilder>
      | EntitiesAttributesParseErrors<TBuilder>,
  ) => ModeOutput<
    TResultMode,
    {
      attributesErrors: EntitiesAttributesValidationErrors<TBuilder>;
    },
    EntitiesAttributesErrorsParseError<TBuilder>
  >;
  readonly setSchemaError: (
    schemaError: InferBuilderSchemaRefineError<TBuilder>,
  ) => ModeOutput<
    TResultMode,
    {
      schemaError: InferBuilderSchemaRefineError<TBuilder>;
    }
  >;
  readonly clearSchemaError: () => ModeOutput<TResultMode>;
  readonly validateSchema: () => ModeAsyncOutput<
    TResultMode,
    { readonly schema: ParsedSchema<TBuilder> },
    EntitiesAttributesValidationError<TBuilder> | SchemaRefineError<TBuilder>
  >;
}

export type EffectfulBuilderStore<TBuilder extends Builder> =
  GenericBuilderStore<TBuilder, EffectMode>;

export type BuilderStore<TBuilder extends Builder> = GenericBuilderStore<
  TBuilder,
  ResultMode
>;

type CreateBuilderStoreError<TBuilder extends Builder> =
  | ParseSchemaError<TBuilder>
  | EntitiesAttributesErrorsParseError<TBuilder>;

interface CreateBuilderStoreOptions<TBuilder extends Builder> {
  initialData?: PartialBuilderStoreData<TBuilder>;
}

export class EntitiesAttributesErrorsParseError<
  TBuilder extends Builder,
> extends D.TaggedError("EntitiesAttributesErrorsParseError")<{
  readonly cause:
    | ReferencedEntityNotFoundError
    | InvalidAttributeNameError<TBuilder>;
}> {}

export class EntityIdAlreadyExistsError<
  TBuilder extends Builder = Builder,
> extends D.TaggedError("EntityIdAlreadyExistsError")<{
  readonly entityRef: EntityRef<TBuilder>;
}> {}

export class IndexOutOfBoundsError extends D.TaggedError(
  "IndexOutOfBoundsError",
)<{
  readonly index: number;
  readonly arrayLength: number;
}> {}

export function parseEntitiesAttributesErrors<TBuilder extends Builder>(
  entitiesAttributesErrors: EntitiesAttributesValidationErrors<TBuilder>,
  schema: DraftSchema<TBuilder>,
  builder: TBuilder,
): E.Effect<
  EntitiesAttributesValidationErrors<TBuilder>,
  EntitiesAttributesErrorsParseError<TBuilder>
> {
  return pipe(
    R.toEntries(entitiesAttributesErrors),
    E.forEach(([entityId, attributesErrors]) =>
      pipe(
        getSchemaEntityById(entityId, schema.entities),
        E.flatMap((entity) =>
          validateEntityAttributeNames(
            entity.type,
            entityId,
            R.keys(attributesErrors as EntityAttributesValidationErrors),
            builder,
          ),
        ),
      ),
    ),
    E.as(entitiesAttributesErrors),
    E.mapErrorCause(
      C.map((e) => new EntitiesAttributesErrorsParseError({ cause: e })),
    ),
  );
}

function makeRemoveEntity<TBuilder extends Builder>(
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["removeEntity"] {
  return (entityRef) =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("entity", ({ currentSchema }) =>
        getSchemaEntityByRef(entityRef, currentSchema.entities),
      ),
      E.bind("idsToRemove", ({ currentSchema }) =>
        pipe(
          collectEntityDescendants(entityRef.id, currentSchema),
          E.map((descendants) => A.appendAll([entityRef.id], descendants)),
        ),
      ),
      E.bind("filteredEntities", ({ currentSchema, idsToRemove }) =>
        E.succeed(
          R.filter(
            currentSchema.entities,
            (_, id) => !A.contains(idsToRemove, id),
          ),
        ),
      ),
      E.bind("newEntities", ({ entity, filteredEntities }) =>
        pipe(
          O.fromNullable(entity.parentId),
          O.map((parentId) =>
            pipe(
              getSchemaEntityById(parentId, filteredEntities),
              E.map((parentEntity) =>
                R.modify(filteredEntities, parentId, (parent) => ({
                  ...parent,
                  children: A.filter(
                    parentEntity.children ?? [],
                    (id) => id !== entityRef.id,
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
          root: A.filter(currentSchema.root, (id) => id !== entityRef.id),
        }),
      ),
      E.tap(({ newSchema }) =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            schema: newSchema,
          })),
        ),
      ),
      E.map(({ currentSchema, idsToRemove }) => ({
        removedEntityRefs: A.filterMap(idsToRemove, (id) =>
          pipe(
            O.fromNullable(currentSchema.entities[id]),
            O.map((entity) => createEntityRef(entity.type, id)),
          ),
        ),
      })),
    );
}

export function makeGetEntityIndex<TBuilder extends Builder>(
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["getEntityIndex"] {
  return (entityRef) =>
    pipe(
      E.Do,
      E.bind("schema", () => E.sync(() => dataStore.state.schema)),
      E.bind("entity", ({ schema }) =>
        getSchemaEntityByRef(entityRef, schema.entities),
      ),
      E.flatMap(({ entity, schema }) =>
        pipe(
          A.findFirstIndex(
            entity.parentId
              ? (schema.entities[entity.parentId]?.children ?? [])
              : schema.root,
            (id) => id === entityRef.id,
          ),
          O.map((index) => E.succeed(index)),
          O.getOrElse(() =>
            E.dieMessage(
              `Couldn't retrieve current index of entity "${entityRef.id}". This is likely a bug.`,
            ),
          ),
        ),
      ),
    );
}

export function makeSetEntityIndex<TBuilder extends Builder>(
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
  getEntityIndex: EffectfulBuilderStore<TBuilder>["getEntityIndex"],
): EffectfulBuilderStore<TBuilder>["setEntityIndex"] {
  return (entityRef, indexOrCompute) =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("entity", ({ currentSchema }) =>
        getSchemaEntityByRef(entityRef, currentSchema.entities),
      ),
      E.bind("newIndex", () =>
        pipe(
          M.value(indexOrCompute),
          M.when(M.number, (value) => E.succeed(value)),
          M.orElse((computeIndex) =>
            pipe(
              getEntityIndex(entityRef),
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
              getSchemaEntityById(parentId, currentSchema.entities),
              E.map((parentEntity) =>
                parentEntity.children
                  ? A.filter(parentEntity.children, (id) => id !== entityRef.id)
                  : [],
              ),
              E.flatMap((filteredChildren) =>
                insertAt(filteredChildren, entityRef.id, newIndex),
              ),
              E.map((updatedChildren) => ({
                ...currentSchema,
                entities: R.modify(
                  currentSchema.entities,
                  parentId,
                  (parentEntity) => ({
                    ...parentEntity,
                    children: updatedChildren.array,
                  }),
                ),
              })),
            ),
          ),
          O.getOrElse(() =>
            pipe(
              A.filter(currentSchema.root, (id) => id !== entityRef.id),
              (filteredRoot) =>
                pipe(
                  insertAt(filteredRoot, entityRef.id, newIndex),
                  E.map((updatedRoot) => ({
                    ...currentSchema,
                    root: updatedRoot.array,
                  })),
                ),
            ),
          ),
        ),
      ),
      E.tap(({ updatedSchema }) =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            schema: updatedSchema,
          })),
        ),
      ),
      E.map(({ newIndex }) => ({ entityRef, index: newIndex })),
    );
}

export function makeSetEntityParent<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["setEntityParent"] {
  return (entityRef, newParentRef, options) =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("entity", ({ currentSchema }) =>
        getSchemaEntityByRef(entityRef, currentSchema.entities),
      ),
      E.tap(({ entity }) =>
        validateParentRequired(
          entity.type,
          entityRef.id,
          newParentRef?.id,
          builder,
        ),
      ),
      E.bind("maybeNewParent", ({ currentSchema }) =>
        pipe(
          O.fromNullable(newParentRef),
          O.map((parentRef) =>
            pipe(
              getSchemaEntityByRef(parentRef, currentSchema.entities),
              E.map((parentEntity) => ({
                id: parentRef.id,
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
          O.map(({ entity: parent, id: parentId }) =>
            E.all([
              validateEntityParentAllowed(
                entity.type,
                entityRef.id,
                parent.type,
                builder,
              ),
              validateEntityChildrenAllowed(
                parent.type,
                parentId,
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
              getSchemaEntityById(parentId, currentSchema.entities),
              E.map((parentEntity) =>
                R.modify(currentSchema.entities, parentId, (parent) => ({
                  ...parent,
                  children: A.filter(
                    parentEntity.children ?? [],
                    (id) => id !== entityRef.id,
                  ),
                })),
              ),
              E.map((entities) => ({
                entities,
                root: A.filter(currentSchema.root, (id) => id !== entityRef.id),
              })),
            ),
          ),
          O.getOrElse(() =>
            E.succeed({
              entities: currentSchema.entities,
              root: A.filter(currentSchema.root, (id) => id !== entityRef.id),
            }),
          ),
        ),
      ),
      E.bind("result", ({ removed, maybeNewParent }) =>
        pipe(
          O.fromNullable(maybeNewParent),
          O.map(({ id: parentId }) =>
            pipe(
              getSchemaEntityById(parentId, removed.entities),
              E.flatMap((parentEntity) =>
                insertAt(
                  parentEntity.children
                    ? A.filter(
                        parentEntity.children,
                        (id) => id !== entityRef.id,
                      )
                    : [],
                  entityRef.id,
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
                      R.modify(entities, entityRef.id, (entity) => ({
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
              insertAt(removed.root, entityRef.id, options?.index),
              E.map((updatedRoot) => ({
                schema: {
                  entities: R.modify(
                    removed.entities,
                    entityRef.id,
                    (entity) => S.omit(entity, "parentId") as typeof entity,
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
          dataStore.setState((prev) => ({
            ...prev,
            schema: result.schema,
          })),
        ),
      ),
      E.map(({ result }) => ({
        entityRef,
        parentRef: newParentRef,
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
  entities: DraftSchema["entities"],
): E.Effect<void, EntityIdAlreadyExistsError> {
  return pipe(
    R.get(entities, entityId),
    O.map((entity) =>
      E.fail(
        new EntityIdAlreadyExistsError({
          entityRef: createEntityRef(entity.type, entityId),
        }),
      ),
    ),
    O.getOrElse(() => E.void),
  );
}

function addRawEntity(
  entityId: string,
  newEntity: DraftSchemaEntity,
  schema: DraftSchema,
  index?: number,
): E.Effect<
  {
    updatedSchema: DraftSchema;
    index: number;
  },
  IndexOutOfBoundsError | ReferencedEntityNotFoundError
> {
  return pipe(R.set(schema.entities, entityId, newEntity), (entities) =>
    pipe(
      O.fromNullable(newEntity.parentId),
      O.map((parentId) =>
        pipe(
          getSchemaEntityById(parentId, schema.entities),
          E.flatMap((parentEntity) =>
            pipe(
              insertAt(parentEntity.children ?? [], entityId, index),
              E.map((updatedChildren) => ({
                updatedSchema: {
                  ...schema,
                  entities: R.modify(entities, parentId, (parentEntity) => ({
                    ...parentEntity,
                    children: updatedChildren.array,
                  })),
                },
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
            updatedSchema: {
              ...schema,
              entities: entities,
              root: updatedRoot.array,
            },
            index: updatedRoot.index,
          })),
        ),
      ),
    ),
  );
}

function generateEntityId(
  entities: DraftSchema["entities"],
  builder: Builder,
): E.Effect<string, InvalidEntityIdError | EntityIdAlreadyExistsError> {
  return pipe(
    E.sync(() => builder.generateEntityId()),
    E.tap((id) =>
      E.all([
        validateEntityId(id, builder),
        validateEntityIdUniqueness(id, entities),
      ]),
    ),
  );
}

function makeAddEntity<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["addEntity"] {
  return (payload) =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("entityId", ({ currentSchema }) =>
        pipe(
          O.fromNullable(payload.id),
          O.map((id) =>
            pipe(
              E.succeed(id),
              E.tap((id) => validateEntityId(id, builder)),
              E.tap((id) =>
                validateEntityIdUniqueness(id, currentSchema.entities),
              ),
            ),
          ),
          O.getOrElse(() => generateEntityId(currentSchema.entities, builder)),
        ),
      ),
      E.tap(({ currentSchema, entityId }) =>
        E.all([
          validateEntityConstraints(
            payload.type,
            entityId,
            payload.attributes ?? {},
            payload.parentId,
            currentSchema.entities,
            builder,
          ),
        ]),
      ),
      E.bind("parsedAttributes", ({ entityId }) =>
        pipe(
          parseEntityAttributes(
            payload.type,
            computeEntityAttributesWithDefaults(
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
                  new EntityAttributesParseError<
                    typeof builder,
                    typeof payload.type
                  >({
                    entityRef: createEntityRef(payload.type, entityId),
                    errors: result.errors,
                  }),
                ),
            }),
        ),
      ),
      E.bind("newEntity", ({ parsedAttributes }) =>
        pipe(S.pick(payload, "type", "parentId"), (computedPayload) =>
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
          dataStore.setState((prev) => ({
            ...prev,
            schema: result.updatedSchema,
          })),
        ),
      ),
      E.map(({ newEntity, entityId, result }) => ({
        entity: {
          ...newEntity,
          ref: createEntityRef(payload.type, entityId),
          id: entityId,
        },
        index: result.index,
      })),
    );
}

function makeGetEntity<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["getEntity"] {
  return (entityRef) =>
    pipe(
      E.sync(() => dataStore.state.schema.entities),
      E.flatMap((entities) => getSchemaEntityByRef(entityRef, entities)),
      E.map((entity) =>
        pipe(
          getEntityDefinitionDangerously(entity.type, builder),
          (entityDefinition) =>
            R.map(entityDefinition.attributes, (_, attributeName) =>
              pipe(
                createAttributeRef(entity.type, entityRef.id, attributeName),
                (ref) => ({
                  ref,
                  value: entity.attributes[attributeName],
                }),
              ),
            ),
          (attributes) => ({
            ...entity,
            type: entityRef.type,
            id: entityRef.id,
            ref: createEntityRef(entityRef.type, entityRef.id),
            attributes: attributes satisfies Record<
              string,
              E.Effect.Success<
                ReturnType<EffectfulBuilderStore<TBuilder>["getEntity"]>
              >["attributes"][string]
            > as never,
          }),
        ),
      ),
    );
}

export function makeCloneEntity<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["cloneEntity"] {
  return (entityRef, options) =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("source", ({ currentSchema }) =>
        getSchemaEntityByRef(entityRef, currentSchema.entities),
      ),
      E.bind("descendants", ({ currentSchema }) =>
        collectEntityDescendants(entityRef.id, currentSchema),
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
                  getSchemaEntityById(parentId, currentSchema.entities),
                  E.map((parent) =>
                    pipe(parent.children ?? [], (kids) =>
                      pipe(
                        A.findFirstIndex(kids, (id) => id === entityRef.id),
                        O.map((i) => i + 1),
                        O.getOrElse(() => kids.length),
                      ),
                    ),
                  ),
                ),
              ),
              O.getOrElse(() =>
                pipe(
                  A.findFirstIndex(
                    currentSchema.root,
                    (id) => id === entityRef.id,
                  ),
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
      E.bind(
        "rootClone",
        ({ currentSchema, source, targetIndex, rootCloneId }) =>
          pipe(
            { ...source, attributes: { ...source.attributes } },
            S.omit("children"),
            (clonedEntity) =>
              addRawEntity(
                rootCloneId,
                clonedEntity,
                currentSchema,
                targetIndex,
              ),
          ),
      ),
      E.bind(
        "folded",
        ({ currentSchema, descendants, rootClone, rootCloneId }) =>
          pipe(
            descendants,
            E.reduce(
              {
                schema: rootClone.updatedSchema,
                idMap: R.set({}, entityRef.id, rootCloneId),
              },
              (acc, originalChildId) =>
                pipe(
                  generateEntityId(acc.schema.entities, builder),
                  E.flatMap((childCloneId) =>
                    pipe(
                      getSchemaEntityById(
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
          dataStore.setState((prev) => ({
            ...prev,
            schema: folded.schema,
          })),
        ),
      ),
      E.map(({ rootClone, rootCloneId }) => ({
        sourceEntityRef: entityRef,
        clonedEntityRef: createEntityRef(entityRef.type, rootCloneId),
        index: rootClone.index,
      })),
    );
}

function parsePartialBuilderStoreData<TBuilder extends Builder>(
  builder: TBuilder,
  partialData?: PartialBuilderStoreData<TBuilder>,
): E.Effect<
  BuilderStoreData<TBuilder>,
  ParseSchemaError<TBuilder> | EntitiesAttributesErrorsParseError<TBuilder>
> {
  return pipe(
    O.fromNullable(partialData?.schema),
    O.map((schema) => parseDraftSchemaEffectfully(schema, builder)),
    O.getOrElse(() =>
      E.succeed<DraftSchema<TBuilder>>({
        entities: {},
        root: [],
      }),
    ),
    E.flatMap((parsedSchema) =>
      pipe(
        O.fromNullable(partialData?.errors?.attributes),
        O.map((attributeErrors) =>
          parseEntitiesAttributesErrors(
            attributeErrors as EntitiesAttributesValidationErrors<TBuilder>,
            parsedSchema,
            builder,
          ),
        ),
        O.getOrElse(() =>
          E.succeed({} as EntitiesAttributesValidationErrors<TBuilder>),
        ),
        E.map((entitiesAttributesErrors) => ({
          schema: parsedSchema,
          errors: {
            attributes: entitiesAttributesErrors,
            ...(partialData?.errors?.schema
              ? { schema: partialData.errors.schema }
              : {}),
          },
        })),
      ),
    ),
  );
}

function makeSetData<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["setData"] {
  return (data) =>
    pipe(
      parsePartialBuilderStoreData(builder, data),
      E.tap((parsedData) => E.sync(() => dataStore.setState(parsedData))),
      E.map((parsedData) => parsedData),
    );
}

function makeSetEntityAttributeValue<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["setEntityAttributeValue"] {
  return (attributeRef, attributeValue) =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("entity", ({ currentSchema }) =>
        getSchemaEntityByRef(attributeRef.entityRef, currentSchema.entities),
      ),
      E.bind("attributeDefinition", ({ entity }) =>
        pipe(
          getEntityDefinitionDangerously(entity.type, builder),
          (entityDefinition) =>
            getAttributeDefinition(
              entity.type,
              attributeRef.entityRef.id,
              entityDefinition,
              attributeRef.name,
            ),
        ),
      ),
      E.bind("valueParseResult", ({ attributeDefinition }) =>
        E.succeed(
          parseEntityAttribute(
            attributeRef.name,
            attributeValue,
            attributeDefinition,
          ),
        ),
      ),
      E.flatMap(({ valueParseResult }) =>
        Ei.match(valueParseResult, {
          onLeft: (error) =>
            E.fail(
              new EntityAttributeParseError({
                attributeRef,
                cause: error,
              }),
            ),
          onRight: (value) =>
            pipe(
              E.sync(() =>
                dataStore.setState((prevState) => ({
                  ...prevState,
                  schema: {
                    ...prevState.schema,
                    entities: R.modify(
                      prevState.schema.entities,
                      attributeRef.entityRef.id,
                      (existingEntity) => ({
                        ...existingEntity,
                        attributes: R.set(
                          existingEntity.attributes,
                          attributeRef.name,
                          value,
                        ),
                      }),
                    ),
                  },
                })),
              ),
              E.as({
                attributeRef,
                attributeValue: value,
              }),
            ),
        }),
      ),
    );
}

function makeSetEntityAttributesValues<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["setEntityAttributesValues"] {
  return (entityRef, attributesValues) =>
    pipe(
      validateSchemaEntityRef(entityRef, dataStore.state.schema.entities),
      E.flatMap(() =>
        validateEntityAttributeNames(
          entityRef.type,
          entityRef.id,
          R.keys(attributesValues),
          builder,
        ),
      ),
      E.map(() =>
        parseEntityAttributes(entityRef.type, attributesValues, builder),
      ),
      E.flatMap((parseResult) =>
        pipe(
          E.fail(
            new EntityAttributesParseError({
              entityRef,
              errors: parseResult.errors,
            }),
          ),
          E.unless(() => R.isEmptyRecord(parseResult.errors)),
          E.flatMap(() =>
            E.sync(() =>
              dataStore.setState((prevState) => ({
                ...prevState,
                schema: {
                  ...prevState.schema,
                  entities: R.modify(
                    prevState.schema.entities,
                    entityRef.id,
                    (existingEntity) => ({
                      ...existingEntity,
                      attributes: { ...parseResult.values },
                    }),
                  ),
                },
              })),
            ),
          ),
        ),
      ),
      E.as({
        entityRef,
      }),
    );
}

function makeResetEntityAttributeValue<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
  setEntityAttributeValue: EffectfulBuilderStore<TBuilder>["setEntityAttributeValue"],
  clearEntityAttributeValue: EffectfulBuilderStore<TBuilder>["clearEntityAttributeValue"],
): EffectfulBuilderStore<TBuilder>["resetEntityAttributeValue"] {
  return (attributeRef) =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("entity", ({ currentSchema }) =>
        getSchemaEntityByRef(attributeRef.entityRef, currentSchema.entities),
      ),
      E.bind("attributeDefinition", ({ entity }) =>
        pipe(
          getEntityDefinitionDangerously(entity.type, builder),
          (entityDefinition) =>
            getAttributeDefinition(
              entity.type,
              attributeRef.entityRef.id,
              entityDefinition,
              attributeRef.name,
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
              attributeRef,
              defaultValueFn({
                attribute: {
                  metadata: attributeDefinition.metadata,
                  name: attributeRef.name,
                },
              }),
            ),
          ),
          O.getOrElse(() =>
            pipe(
              clearEntityAttributeValue(attributeRef),
              E.map(() => ({
                attributeRef,
                attributeValue: undefined,
              })),
            ),
          ),
        ),
      ),
    );
}

export function makeClearEntityAttributeValue<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["clearEntityAttributeValue"] {
  return (attributeRef) =>
    pipe(
      E.sync(() => dataStore.state.schema.entities),
      E.flatMap((entities) =>
        getSchemaEntityByRef(attributeRef.entityRef, entities),
      ),
      E.tap((entity) =>
        validateEntityAttributeName(
          entity.type,
          attributeRef.entityRef.id,
          attributeRef.name,
          builder,
        ),
      ),
      E.tap((entity) =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            schema: {
              ...prevState.schema,
              entities: R.set(
                prevState.schema.entities,
                attributeRef.entityRef.id,
                {
                  ...entity,
                  attributes: R.remove(
                    entity.attributes,
                    attributeRef.name,
                  ) as typeof entity.attributes,
                },
              ),
            },
          })),
        ),
      ),
      E.as({
        attributeRef,
      }),
    );
}

export function makeClearEntityAttributesValues<TBuilder extends Builder>(
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["clearEntityAttributesValues"] {
  return (entityRef) =>
    pipe(
      E.sync(() => dataStore.state.schema.entities),
      E.flatMap((entities) => getSchemaEntityByRef(entityRef, entities)),
      E.tap((entity) =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            schema: {
              ...prevState.schema,
              entities: R.set(prevState.schema.entities, entityRef.id, {
                ...entity,
                attributes: {},
              }),
            },
          })),
        ),
      ),
      E.as({ entityRef }),
    );
}

export function makeClearEntityAttributeError<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["clearEntityAttributeError"] {
  return (attributeRef) =>
    pipe(
      E.sync(() => dataStore.state.schema.entities),
      E.flatMap((entities) =>
        getSchemaEntityByRef(attributeRef.entityRef, entities),
      ),
      E.tap((entity) =>
        validateEntityAttributeName(
          entity.type,
          attributeRef.entityRef.id,
          attributeRef.name,
          builder,
        ),
      ),
      E.tap(() =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            errors: {
              ...prevState.errors,
              attributes: filterEmptyRecords(
                R.set(
                  prevState.errors.attributes,
                  attributeRef.entityRef.id,
                  pipe(
                    prevState.errors.attributes[attributeRef.entityRef.id] ??
                      {},
                    (entityErrors) =>
                      R.remove(
                        entityErrors,
                        attributeRef.name as keyof typeof entityErrors,
                      ),
                  ),
                ),
              ) as EntitiesAttributesValidationErrors<TBuilder>,
            },
          })),
        ),
      ),
      E.as({
        attributeRef,
      }),
    );
}

export function makeClearEntityAttributesErrors<TBuilder extends Builder>(
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["clearEntityAttributesErrors"] {
  return (entityRef) =>
    pipe(
      E.sync(() => dataStore.state.schema.entities),
      E.tap((entities) => validateSchemaEntityRef(entityRef, entities)),
      E.tap(() =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            errors: {
              ...prevState.errors,
              attributes: filterEmptyRecords(
                R.remove(prevState.errors.attributes, entityRef.id),
              ) as EntitiesAttributesValidationErrors<TBuilder>,
            },
          })),
        ),
      ),
      E.as({ entityRef }),
    );
}

export function makeClearEntitiesAttributesErrors<
  TBuilder extends Builder = Builder,
>(
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["clearEntitiesAttributesErrors"] {
  return () =>
    pipe(
      E.sync(() =>
        dataStore.setState((prevState) => ({
          ...prevState,
          errors: {
            ...prevState.errors,
            attributes: {} as EntitiesAttributesValidationErrors<TBuilder>,
          },
        })),
      ),
    );
}

export function makeValidateEntityAttribute<TBuilder extends Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["validateEntityAttribute"] {
  return (attributeRef) =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("entity", ({ currentSchema }) =>
        getSchemaEntityByRef(attributeRef.entityRef, currentSchema.entities),
      ),
      E.bind("attributeDefinition", ({ entity }) =>
        pipe(
          getEntityDefinitionDangerously(entity.type, builder),
          (entityDefinition) =>
            getAttributeDefinition(
              entity.type,
              attributeRef.entityRef.id,
              entityDefinition,
              attributeRef.name,
            ),
        ),
      ),
      E.bind(
        "validatedValueResult",
        ({ entity, attributeDefinition, currentSchema }) =>
          validateEntityAttribute(
            attributeRef.entityRef.id,
            entity,
            attributeRef.name,
            entity.attributes[attributeRef.name],
            attributeDefinition,
            currentSchema,
            builder,
          ),
      ),
      E.flatMap(({ validatedValueResult }) =>
        Ei.match(validatedValueResult, {
          onLeft: (error) =>
            pipe(
              E.sync(() =>
                dataStore.setState((prevState) => ({
                  ...prevState,
                  errors: {
                    ...prevState.errors,
                    attributes: filterEmptyRecords(
                      R.set(
                        prevState.errors.attributes,
                        attributeRef.entityRef.id,
                        pipe(
                          prevState.errors.attributes[
                            attributeRef.entityRef.id
                          ] ?? {},
                          (entityErrors) =>
                            R.set(entityErrors, attributeRef.name, error),
                        ),
                      ),
                    ) as EntitiesAttributesValidationErrors<TBuilder>,
                  },
                })),
              ),
              E.flatMap(() =>
                E.fail(
                  new EntityAttributeValidationError({
                    attributeRef,
                    cause: error,
                  }),
                ),
              ),
            ),
          onRight: (value) =>
            pipe(
              E.sync(() =>
                dataStore.setState((prevState) => ({
                  ...prevState,
                  schema: {
                    ...prevState.schema,
                    entities: R.modify(
                      prevState.schema.entities,
                      attributeRef.entityRef.id,
                      (existingEntity) => ({
                        ...existingEntity,
                        attributes: R.set(
                          existingEntity.attributes,
                          attributeRef.name,
                          value,
                        ),
                      }),
                    ),
                  },
                  errors: {
                    ...prevState.errors,
                    attributes: filterEmptyRecords(
                      R.set(
                        prevState.errors.attributes,
                        attributeRef.entityRef.id,
                        pipe(
                          prevState.errors.attributes[
                            attributeRef.entityRef.id
                          ] ?? {},
                          (entityErrors) =>
                            R.remove(
                              entityErrors,
                              attributeRef.name as keyof typeof entityErrors,
                            ),
                        ),
                      ),
                    ) as EntitiesAttributesValidationErrors<TBuilder>,
                  },
                })),
              ),
              E.as({
                attributeRef: attributeRef,
                attributeValue: value,
              }),
            ),
        }),
      ),
    );
}

export function makeValidateEntityAttributes<
  TBuilder extends Builder = Builder,
>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["validateEntityAttributes"] {
  return (entityRef) =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("entity", ({ currentSchema }) =>
        getSchemaEntityByRef(entityRef, currentSchema.entities),
      ),
      E.bind("validatedAttributes", ({ entity, currentSchema }) =>
        validateEntityAttributes(entityRef.id, entity, currentSchema, builder),
      ),
      E.flatMap(({ validatedAttributes, currentSchema }) =>
        pipe(
          E.succeed({
            ...currentSchema.entities[entityRef.id]?.attributes,
            ...validatedAttributes.values,
          }),
          E.tap((attributes) =>
            E.sync(() =>
              dataStore.setState((prevState) => ({
                ...prevState,
                schema: {
                  ...prevState.schema,
                  entities: R.modify(
                    prevState.schema.entities,
                    entityRef.id,
                    (existingEntity) => ({
                      ...existingEntity,
                      attributes: attributes,
                    }),
                  ),
                },
                errors: {
                  ...prevState.errors,
                  attributes: filterEmptyRecords(
                    R.set(
                      prevState.errors.attributes,
                      entityRef.id,
                      validatedAttributes.errors,
                    ),
                  ) as EntitiesAttributesValidationErrors<TBuilder>,
                },
              })),
            ),
          ),
          E.flatMap((attributes) =>
            pipe(
              E.fail(
                new EntityAttributesValidationError({
                  entityRef,
                  errors: validatedAttributes.errors,
                }),
              ),
              E.unless(() =>
                R.isEmptyRecord(
                  validatedAttributes.errors as EntityAttributesValidationErrors,
                ),
              ),
              E.map(() => ({
                entityRef,
                attributes: attributes as ParsedSchemaEntity<
                  TBuilder,
                  typeof entityRef.type
                >["attributes"],
              })),
            ),
          ),
        ),
      ),
    );
}

export function makeValidateEntitiesAttributes<
  TBuilder extends Builder = Builder,
>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["validateEntitiesAttributes"] {
  return () =>
    pipe(
      E.Do,
      E.bind("currentSchema", () => E.sync(() => dataStore.state.schema)),
      E.bind("validationResult", ({ currentSchema }) =>
        validateEntitiesAttributes(currentSchema, builder),
      ),
      E.flatMap(({ validationResult, currentSchema }) =>
        pipe(
          E.sync(() =>
            dataStore.setState((prevState) => ({
              ...prevState,
              schema: {
                ...prevState.schema,
                entities: validationResult.entities,
              },
              errors: {
                ...prevState.errors,
                attributes: filterEmptyRecords(
                  validationResult.attributeErrors,
                ),
              },
            })),
          ),
          E.flatMap(() =>
            E.if(R.isEmptyRecord(validationResult.attributeErrors), {
              onTrue: () =>
                E.succeed({
                  schema: {
                    ...currentSchema,
                    entities: validationResult.entities,
                  },
                }),
              onFalse: () =>
                E.fail(
                  new EntitiesAttributesValidationError({
                    errors: validationResult.attributeErrors,
                  }),
                ),
            }),
          ),
        ),
      ),
    );
}

export function makeValidateSchema<TBuilder extends Builder = Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
  validateEntitiesAttributes: EffectfulBuilderStore<TBuilder>["validateEntitiesAttributes"],
): EffectfulBuilderStore<TBuilder>["validateSchema"] {
  return () =>
    pipe(
      validateEntitiesAttributes(),
      E.flatMap(({ schema }) =>
        refineSchema(schema as ParsedSchema<TBuilder>, builder),
      ),
      E.tap(() =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            errors: S.omit(prevState.errors, "schema"),
          })),
        ),
      ),
      E.tapErrorTag("SchemaRefineError", (error) =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            errors: {
              ...prevState.errors,
              schema: error.cause,
            },
          })),
        ),
      ),
      E.map((refinedSchema) => ({
        schema: refinedSchema,
      })),
    );
}

export function makeSetEntityAttributeError<TBuilder extends Builder = Builder>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["setEntityAttributeError"] {
  return (attributeRef, attributeError) =>
    pipe(
      E.sync(() => dataStore.state.schema.entities),
      E.flatMap((entities) =>
        getSchemaEntityByRef(attributeRef.entityRef, entities),
      ),
      E.tap((entity) =>
        validateEntityAttributeName(
          entity.type,
          attributeRef.entityRef.id,
          attributeRef.name,
          builder,
        ),
      ),
      E.tap(() =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            errors: {
              ...prevState.errors,
              attributes: filterEmptyRecords(
                R.set(
                  prevState.errors.attributes,
                  attributeRef.entityRef.id,
                  pipe(
                    prevState.errors.attributes[attributeRef.entityRef.id] ??
                      {},
                    (entityErrors) =>
                      R.set(entityErrors, attributeRef.name, attributeError),
                  ),
                ),
              ) as EntitiesAttributesValidationErrors<TBuilder>,
            },
          })),
        ),
      ),
      E.map(() => ({
        entityRef: attributeRef.entityRef,
        attributeName: attributeRef.name,
        attributeError,
      })),
    );
}

export function makeSetEntityAttributesErrors<
  TBuilder extends Builder = Builder,
>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["setEntityAttributesErrors"] {
  return (entityRef, attributesErrors) =>
    pipe(
      E.sync(() => dataStore.state.schema.entities),
      E.flatMap((entities) => getSchemaEntityByRef(entityRef, entities)),
      E.tap((entity) =>
        validateEntityAttributeNames(
          entity.type,
          entityRef.id,
          R.keys(attributesErrors as EntityAttributesValidationErrors),
          builder,
        ),
      ),
      E.tap(() =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            errors: {
              ...prevState.errors,
              attributes: filterEmptyRecords(
                R.set(
                  prevState.errors.attributes,
                  entityRef.id,
                  attributesErrors,
                ),
              ) as EntitiesAttributesValidationErrors<TBuilder>,
            },
          })),
        ),
      ),
      E.map(() => ({ entityRef, attributesErrors })),
    );
}

export function makeSetEntitiesAttributesErrors<
  TBuilder extends Builder = Builder,
>(
  builder: TBuilder,
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["setEntitiesAttributesErrors"] {
  return (entitiesAttributesErrors) =>
    pipe(
      E.sync(() => dataStore.state.schema),
      E.flatMap((schema) =>
        parseEntitiesAttributesErrors(
          entitiesAttributesErrors as EntitiesAttributesValidationErrors<TBuilder>,
          schema,
          builder,
        ),
      ),
      E.tap((errors) =>
        E.sync(() =>
          dataStore.setState((prevState) => ({
            ...prevState,
            errors: {
              ...prevState.errors,
              attributes: filterEmptyRecords(errors),
            },
          })),
        ),
      ),
      E.map((attributesErrors) => ({ attributesErrors })),
    );
}

export function makeSetSchemaError<TBuilder extends Builder = Builder>(
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["setSchemaError"] {
  return (schemaError) =>
    pipe(
      E.sync(() =>
        dataStore.setState((prevState) => ({
          ...prevState,
          errors: {
            ...prevState.errors,
            schema: schemaError,
          },
        })),
      ),
      E.map(() => ({ schemaError })),
    );
}

export function makeClearSchemaError<TBuilder extends Builder = Builder>(
  dataStore: DataStore<BuilderStoreData<TBuilder>>,
): EffectfulBuilderStore<TBuilder>["clearSchemaError"] {
  return () =>
    E.sync(() =>
      dataStore.setState((prevState) => ({
        ...prevState,
        errors: S.omit(prevState.errors, "schema"),
      })),
    );
}

export function createEffectfulBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: CreateBuilderStoreOptions<NoInfer<TBuilder>>,
): E.Effect<
  EffectfulBuilderStore<NoInfer<TBuilder>>,
  CreateBuilderStoreError<TBuilder>
> {
  return pipe(
    parsePartialBuilderStoreData(builder, options?.initialData),
    E.map((builderStoreData) =>
      pipe(new DataStore(builderStoreData), (dataStore) => ({
        ...makeGenericStore(builder, dataStore),
        setData: makeSetData(builder, dataStore),
        addEntity: makeAddEntity(builder, dataStore),
        getEntity: makeGetEntity(builder, dataStore),
        getEntityIndex: makeGetEntityIndex(dataStore),
        cloneEntity: makeCloneEntity(builder, dataStore),
        removeEntity: makeRemoveEntity(dataStore),
        setEntityIndex: makeSetEntityIndex(
          dataStore,
          makeGetEntityIndex(dataStore),
        ),
        setEntityParent: makeSetEntityParent(builder, dataStore),
        setEntityAttributeValue: makeSetEntityAttributeValue(
          builder,
          dataStore,
        ),
        setEntityAttributesValues: makeSetEntityAttributesValues(
          builder,
          dataStore,
        ),
        resetEntityAttributeValue: makeResetEntityAttributeValue(
          builder,
          dataStore,
          makeSetEntityAttributeValue(builder, dataStore),
          makeClearEntityAttributeValue(builder, dataStore),
        ),
        clearEntityAttributeValue: makeClearEntityAttributeValue(
          builder,
          dataStore,
        ),
        clearEntityAttributesValues: makeClearEntityAttributesValues(dataStore),
        validateEntityAttribute: makeValidateEntityAttribute(
          builder,
          dataStore,
        ),
        validateEntityAttributes: makeValidateEntityAttributes(
          builder,
          dataStore,
        ),
        validateEntitiesAttributes: makeValidateEntitiesAttributes(
          builder,
          dataStore,
        ),
        clearEntityAttributeError: makeClearEntityAttributeError(
          builder,
          dataStore,
        ),
        clearEntityAttributesErrors: makeClearEntityAttributesErrors(dataStore),
        clearEntitiesAttributesErrors:
          makeClearEntitiesAttributesErrors(dataStore),
        setEntityAttributeError: makeSetEntityAttributeError(
          builder,
          dataStore,
        ),
        setEntityAttributesErrors: makeSetEntityAttributesErrors(
          builder,
          dataStore,
        ),
        setEntitiesAttributesErrors: makeSetEntitiesAttributesErrors(
          builder,
          dataStore,
        ),
        validateSchema: makeValidateSchema(
          builder,
          dataStore,
          makeValidateEntitiesAttributes(builder, dataStore),
        ),
        setSchemaError: makeSetSchemaError(dataStore),
        clearSchemaError: makeClearSchemaError(dataStore),
      })),
    ),
  );
}

export function createBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: CreateBuilderStoreOptions<NoInfer<TBuilder>>,
): Result<BuilderStore<NoInfer<TBuilder>>, CreateBuilderStoreError<TBuilder>> {
  return E.runSync(
    flatMapAsResult(
      pipe(
        createEffectfulBuilderStore(builder, options),
        E.map(
          (builderStore): BuilderStore<TBuilder> => ({
            ...builderStore,
            addEntity: (...args) =>
              runSyncAsResult(builderStore.addEntity(...args)),
            getEntity: (...args) =>
              runSyncAsResult(builderStore.getEntity(...args)),
            getEntityIndex: (...args) =>
              runSyncAsResult(builderStore.getEntityIndex(...args)),
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
            setEntityAttributesValues: (...args) =>
              runSyncAsResult(builderStore.setEntityAttributesValues(...args)),
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
