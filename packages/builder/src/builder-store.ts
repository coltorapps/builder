import {
  ensureEntityCanLackParent,
  ensureEntityChildAllowed,
  ensureEntityInputIsRegistered,
  ensureEntityInputsAreRegistered,
  ensureEntityIsRegistered,
  type Builder,
} from "./builder";
import {
  deserializeBuilderStoreData,
  serializeBuilderStoreData,
} from "./builder-store-serialization";
import { createDataManager } from "./data-manager";
import { type InputsValues } from "./input";
import {
  SchemaValidationError,
  validateSchemaIntegrity,
  type BaseSchemaEntity,
  type EntitiesInputsErrors,
  type EntityInputsErrors,
  type Schema,
  type SchemaEntity,
} from "./schema";
import { type Store } from "./store";
import { type SubscriptionEvent } from "./subscription-manager";
import { insertIntoSetAtIndex, type KeyofUnion } from "./utils";

export type BuilderStoreEntity<TBuilder extends Builder = Builder> =
  BaseSchemaEntity<
    TBuilder,
    {
      children?: Set<string>;
    }
  >;

export type BuilderStoreEntityWithId<TBuilder extends Builder = Builder> =
  BuilderStoreEntity<TBuilder> & { id: string };

export type SerializedBuilderStoreData<TBuilder extends Builder = Builder> = {
  schema: Schema<TBuilder>;
  entitiesInputsErrors: EntitiesInputsErrors<TBuilder>;
};

export type BuilderStoreData<TBuilder extends Builder = Builder> = {
  schema: {
    entities: Map<string, BuilderStoreEntity<TBuilder>>;
    root: Set<string>;
  };
  entitiesInputsErrors: Map<string, EntityInputsErrors<TBuilder>>;
};

export const builderStoreEventsNames = {
  EntityAdded: "EntityAdded",
  EntityUpdated: "EntityUpdated",
  EntityInputUpdated: "EntityInputUpdated",
  EntityDeleted: "EntityDeleted",
  RootUpdated: "RootUpdated",
  EntityInputErrorUpdated: "EntityInputErrorUpdated",
  DataSet: "DataSet",
} as const;

export type BuilderStoreEventName =
  (typeof builderStoreEventsNames)[keyof typeof builderStoreEventsNames];

export type BuilderStoreEvent<TBuilder extends Builder = Builder> =
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityAdded,
      {
        entity: BuilderStoreEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityUpdated,
      {
        entity: BuilderStoreEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityInputUpdated,
      {
        entity: BuilderStoreEntityWithId<TBuilder>;
        inputName: KeyofUnion<SchemaEntity<TBuilder>["inputs"]>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityDeleted,
      {
        entity: BuilderStoreEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.DataSet,
      {
        data: BuilderStoreData<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityInputErrorUpdated,
      {
        entityId: string;
        inputName: KeyofUnion<SchemaEntity<TBuilder>["inputs"]>;
        error: unknown;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.RootUpdated,
      {
        root: BuilderStoreData<TBuilder>["schema"]["root"];
      }
    >;

export function ensureEntityExists<TBuilder extends Builder>(
  id: string,
  entities: BuilderStoreData<TBuilder>["schema"]["entities"],
): BuilderStoreEntity<TBuilder> {
  const entity = entities.get(id);

  if (!entity) {
    throw new Error(`Entity with ID "${id}" was not found.`);
  }

  const entityClone = { ...entity };

  if (entityClone.children) {
    entityClone.children = new Set(entityClone.children);
  }

  return entityClone;
}

function deleteEntity<TBuilder extends Builder>(
  entityId: string,
  data: BuilderStoreData<TBuilder>,
): {
  data: BuilderStoreData<TBuilder>;
  deletedEntities: BuilderStoreEntityWithId<TBuilder>[];
} {
  const entity = ensureEntityExists(entityId, data.schema.entities);

  const newData: BuilderStoreData<TBuilder> = {
    ...data,
    schema: {
      ...data.schema,
      entities: new Map(data.schema.entities),
    },
  };

  newData.schema.root.delete(entityId);

  if (entity.parentId) {
    const parentEntity = ensureEntityExists(
      entity.parentId,
      newData.schema.entities,
    );

    parentEntity.children?.delete(entityId);

    newData.schema.entities.set(entity.parentId, parentEntity);
  }

  let deletedEntities: BuilderStoreEntityWithId<TBuilder>[] = [
    {
      ...entity,
      id: entityId,
    },
  ];

  const childrenDeletionResult = Array.from(entity.children ?? []).reduce<{
    data: BuilderStoreData<TBuilder>;
    deletedEntities: BuilderStoreEntityWithId<TBuilder>[];
  }>(
    (result, childId) => {
      const childDeletion = deleteEntity(childId, result.data);

      return {
        data: childDeletion.data,
        deletedEntities: result.deletedEntities.concat(
          childDeletion.deletedEntities,
        ),
      };
    },
    { data: newData, deletedEntities: [] },
  );

  deletedEntities = deletedEntities.concat(
    childrenDeletionResult.deletedEntities,
  );

  childrenDeletionResult.data.schema.entities.delete(entityId);

  return {
    data: childrenDeletionResult.data,
    deletedEntities,
  };
}

async function validateEntityInput<TBuilder extends Builder>(
  entityId: string,
  inputName: string,
  dependencies: {
    builder: TBuilder;
    data: BuilderStoreData<TBuilder>;
  },
): Promise<BuilderStoreData<TBuilder>["entitiesInputsErrors"]> {
  const entity = ensureEntityExists(
    entityId,
    dependencies.data.schema.entities,
  );

  const input = ensureEntityInputIsRegistered(
    entity.type,
    inputName,
    dependencies.builder,
  );

  const newEntitiesInputsErrors = new Map(
    dependencies.data.entitiesInputsErrors,
  );

  const entityInputsErrors: EntityInputsErrors<TBuilder> = {
    ...newEntitiesInputsErrors.get(entityId),
  };

  try {
    await input.validate(
      entity.inputs[input.name as keyof typeof entity.inputs],
      {
        schema: dependencies.data.schema,
        entity: {
          ...entity,
          id: entityId,
        },
      },
    );

    delete entityInputsErrors?.[
      inputName as keyof EntityInputsErrors<TBuilder>
    ];

    newEntitiesInputsErrors.set(entityId, entityInputsErrors);
  } catch (error) {
    newEntitiesInputsErrors.set(entityId, {
      ...entityInputsErrors,
      [inputName]: error,
    });
  }

  if (Object.keys(newEntitiesInputsErrors.get(entityId) ?? {}).length === 0) {
    newEntitiesInputsErrors.delete(entityId);
  }

  return newEntitiesInputsErrors;
}

async function validateEntityInputs<TBuilder extends Builder>(
  entityId: string,
  dependencies: {
    data: BuilderStoreData<TBuilder>;
    builder: TBuilder;
  },
): Promise<{
  entityInputsErrors: EntityInputsErrors<TBuilder> | undefined;
  events: Array<BuilderStoreEvent<TBuilder>>;
}> {
  let newEntitiesInputsErrors = new Map(dependencies.data.entitiesInputsErrors);

  const entity = ensureEntityExists(
    entityId,
    dependencies.data.schema.entities,
  );

  const entityDefinition = ensureEntityIsRegistered(
    entity.type,
    dependencies.builder,
  );

  const events: Array<BuilderStoreEvent<TBuilder>> = [];

  for (const input of entityDefinition.inputs) {
    newEntitiesInputsErrors = await validateEntityInput(entityId, input.name, {
      ...dependencies,
      data: dependencies.data,
    });

    events.push({
      name: builderStoreEventsNames.EntityInputErrorUpdated,
      payload: {
        entityId,
        inputName: input.name as KeyofUnion<SchemaEntity<TBuilder>["inputs"]>,
        error:
          newEntitiesInputsErrors.get(entityId)?.[
            input.name as keyof EntityInputsErrors<TBuilder>
          ],
      },
    });
  }

  return {
    entityInputsErrors: newEntitiesInputsErrors.get(entityId),
    events,
  };
}

function createEntityInputErrorUpdatedEvent<TBuilder extends Builder>(options: {
  entityId: string;
  inputName: string;
  error: unknown;
}): Extract<
  BuilderStoreEvent<TBuilder>,
  { name: typeof builderStoreEventsNames.EntityInputErrorUpdated }
> {
  return {
    name: builderStoreEventsNames.EntityInputErrorUpdated,
    payload: {
      entityId: options.entityId,
      inputName: options.inputName as KeyofUnion<
        SchemaEntity<TBuilder>["inputs"]
      >,
      error: options.error,
    },
  };
}

function ensureEntitiesInputsErrorsAreValid<TBuilder extends Builder>(
  entitiesInputsErrors: EntitiesInputsErrors<TBuilder>,
  dependencies: {
    entities: Schema<TBuilder>["entities"];
    builder: TBuilder;
  },
): EntitiesInputsErrors<TBuilder> {
  if (
    typeof entitiesInputsErrors !== "object" ||
    Array.isArray(entitiesInputsErrors) ||
    entitiesInputsErrors === null
  ) {
    throw new Error("Invalid errors format");
  }

  const newEntitiesInputsErrors = { ...entitiesInputsErrors };

  for (const [entityId, inputsErrors] of Object.entries(entitiesInputsErrors)) {
    const entity = dependencies.entities[entityId];

    if (!entity) {
      throw new Error("Entity not found.");
    }

    ensureEntityInputsAreRegistered(
      entity.type,
      Object.keys(inputsErrors),
      dependencies.builder,
    );

    newEntitiesInputsErrors[entityId] = inputsErrors;
  }

  return newEntitiesInputsErrors;
}

export function createBuilderStore<TBuilder extends Builder>(options: {
  builder: TBuilder;
  serializedData?: Partial<SerializedBuilderStoreData<TBuilder>>;
}): BuilderStore<TBuilder> {
  const validatedSchema = validateSchemaIntegrity(
    options.serializedData?.schema ?? {
      entities: {},
      root: [],
    },
    {
      builder: options.builder,
    },
  );

  if (!validatedSchema.success) {
    throw new SchemaValidationError(validatedSchema.reason);
  }

  const validatedErrors = ensureEntitiesInputsErrorsAreValid(
    options.serializedData?.entitiesInputsErrors ?? {},
    {
      entities: validatedSchema.data.entities,
      builder: options.builder,
    },
  );

  const { getData, setData, subscribe } = createDataManager<
    BuilderStoreData<TBuilder>,
    BuilderStoreEvent<TBuilder>
  >(
    deserializeBuilderStoreData({
      schema: validatedSchema.data,
      entitiesInputsErrors: validatedErrors ?? {},
    }),
  );

  function setSerializedData(data: SerializedBuilderStoreData<TBuilder>) {
    const validatedSchema = validateSchemaIntegrity(data.schema, {
      builder: options.builder,
    });

    if (!validatedSchema.success) {
      throw new SchemaValidationError(validatedSchema.reason);
    }

    const validatedEntitiesInputsErrors = ensureEntitiesInputsErrorsAreValid(
      data.entitiesInputsErrors,
      {
        entities: validatedSchema.data.entities,
        builder: options.builder,
      },
    );

    const newData = deserializeBuilderStoreData({
      schema: validatedSchema.data,
      entitiesInputsErrors: validatedEntitiesInputsErrors,
    });

    setData(newData, [
      {
        name: builderStoreEventsNames.DataSet,
        payload: {
          data: newData,
        },
      },
    ]);
  }

  return {
    builder: options.builder,
    subscribe,
    getData,
    setData(data) {
      setSerializedData(serializeBuilderStoreData(data));
    },
    setSerializedData: setSerializedData,
    getSerializedData() {
      return serializeBuilderStoreData(getData());
    },
    addEntity(payload) {
      const data = getData();

      const id = options.builder.entityId.generate();

      options.builder.entityId.validate(id);

      if (data.schema.entities.has(id)) {
        throw new Error(`An entitiy with the ID "${id}" already exists.`);
      }

      const newEntity: BuilderStoreEntity<TBuilder> = {
        inputs: payload.inputs,
        type: payload.type,
        parentId: payload?.parentId,
      };

      ensureEntityInputsAreRegistered(
        newEntity.type,
        Object.keys(newEntity.inputs),
        options.builder,
      );

      if (!newEntity.parentId) {
        delete newEntity.parentId;
      }

      const newEntities = new Map(data.schema.entities);

      let newRoot = new Set(data.schema.root);

      newEntities.set(id, newEntity);

      if (!payload?.parentId) {
        newRoot = insertIntoSetAtIndex(newRoot, id, payload?.index);

        ensureEntityCanLackParent(newEntity.type, options.builder);
      } else {
        const parentEntity = ensureEntityExists(
          payload.parentId,
          data.schema.entities,
        );

        ensureEntityChildAllowed(
          parentEntity.type,
          newEntity.type,
          options.builder,
        );

        parentEntity.children = insertIntoSetAtIndex(
          parentEntity.children ?? new Set(),
          id,
          payload?.index,
        );

        newEntities.set(payload.parentId, parentEntity);
      }

      const events: Array<BuilderStoreEvent<TBuilder>> = [
        {
          name: builderStoreEventsNames.EntityAdded,
          payload: {
            entity: { ...newEntity, id },
          },
        },
      ];

      if (!newEntity.parentId) {
        events.push({
          name: builderStoreEventsNames.RootUpdated,
          payload: {
            root: newRoot,
          },
        });
      }

      setData(
        {
          ...data,
          schema: {
            root: newRoot,
            entities: newEntities,
          },
        },
        events,
      );
    },
    setEntityParentId(entityId, parentId, index) {
      const data = getData();

      const newEntities = new Map(data.schema.entities);

      const newRoot = new Set(data.schema.root);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      if (entity.parentId) {
        const oldParentEntity = ensureEntityExists(
          entity.parentId,
          data.schema.entities,
        );

        oldParentEntity.children?.delete(entityId);

        newEntities.set(entity.parentId, oldParentEntity);

        if (entity.parentId !== parentId) {
          events.push({
            name: builderStoreEventsNames.EntityUpdated,
            payload: {
              entity: { ...oldParentEntity, id: entity.parentId },
            },
          });
        }
      } else {
        newRoot.delete(entityId);

        events.push({
          name: builderStoreEventsNames.RootUpdated,
          payload: {
            root: newRoot,
          },
        });
      }

      entity.parentId = parentId;

      newEntities.set(entityId, entity);

      events.push({
        name: builderStoreEventsNames.EntityUpdated,
        payload: {
          entity: { ...entity, id: entityId },
        },
      });

      const newParentEntity = ensureEntityExists(
        parentId,
        data.schema.entities,
      );

      ensureEntityChildAllowed(
        newParentEntity.type,
        entity.type,
        options.builder,
      );

      newParentEntity.children = insertIntoSetAtIndex(
        newParentEntity.children ?? new Set(),
        entityId,
        index,
      );

      newEntities.set(parentId, newParentEntity);

      events.push({
        name: builderStoreEventsNames.EntityUpdated,
        payload: {
          entity: { ...newParentEntity, id: parentId },
        },
      });

      setData(
        {
          ...data,
          schema: {
            entities: newEntities,
            root: newRoot,
          },
        },
        events,
      );
    },
    removeEntityParentId(entityId, index) {
      const data = getData();

      const newEntities = new Map(data.schema.entities);

      const newRoot = new Set(data.schema.root);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      ensureEntityCanLackParent(entity.type, options.builder);

      if (entity.parentId) {
        const oldParentEntity = ensureEntityExists(
          entity.parentId,
          data.schema.entities,
        );

        oldParentEntity.children?.delete(entityId);

        newEntities.set(entity.parentId, oldParentEntity);

        events.push({
          name: builderStoreEventsNames.EntityUpdated,
          payload: {
            entity: { ...oldParentEntity, id: entity.parentId },
          },
        });
      }

      newRoot.delete(entityId);

      events.push({
        name: builderStoreEventsNames.RootUpdated,
        payload: {
          root: newRoot,
        },
      });

      delete entity.parentId;

      newEntities.set(entityId, entity);

      events.push({
        name: builderStoreEventsNames.EntityUpdated,
        payload: {
          entity: { ...entity, id: entityId },
        },
      });

      setData(
        {
          ...data,
          schema: {
            entities: newEntities,
            root: insertIntoSetAtIndex(newRoot, entityId, index),
          },
        },
        events,
      );
    },
    deleteEntity(entityId) {
      const { data, deletedEntities } = deleteEntity(entityId, getData());

      const events = deletedEntities.reduce<Array<BuilderStoreEvent<TBuilder>>>(
        (result, deletedEntity) => {
          result.push({
            name: builderStoreEventsNames.EntityDeleted,
            payload: {
              entity: deletedEntity,
            },
          });

          if (!deletedEntity.parentId) {
            result.push({
              name: builderStoreEventsNames.RootUpdated,
              payload: {
                root: data.schema.root,
              },
            });
          } else if (
            deletedEntity.parentId &&
            !deletedEntities.some((item) => item.id === deletedEntity.parentId)
          ) {
            const parentEntity = ensureEntityExists(
              deletedEntity.parentId,
              data.schema.entities,
            );

            result.push({
              name: builderStoreEventsNames.EntityUpdated,
              payload: {
                entity: {
                  ...parentEntity,
                  id: deletedEntity.parentId,
                },
              },
            });
          }

          return result;
        },
        [],
      );

      setData(data, events);
    },
    setEntityInput(entityId, inputName, inputValue) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityInputIsRegistered(
        entity.type,
        inputName.toString(),
        options.builder,
      );

      entity.inputs = {
        ...entity.inputs,
        [inputName]: inputValue,
      };

      setData(
        {
          ...data,
          schema: {
            root: data.schema.root,
            entities: data.schema.entities.set(entityId, entity),
          },
        },
        [
          {
            name: builderStoreEventsNames.EntityUpdated,
            payload: {
              entity: { ...entity, id: entityId },
            },
          },
          {
            name: builderStoreEventsNames.EntityInputUpdated,
            payload: {
              entity: { ...entity, id: entityId },
              inputName,
            },
          },
        ],
      );
    },
    setEntityIndex(entityId, index) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (entity.parentId) {
        const newEntities = new Map(data.schema.entities);

        const parentEntity = ensureEntityExists(
          entity.parentId,
          data.schema.entities,
        );

        ensureEntityChildAllowed(
          parentEntity.type,
          entity.type,
          options.builder,
        );

        parentEntity.children?.delete(entityId);

        parentEntity.children = insertIntoSetAtIndex(
          parentEntity.children ?? new Set(),
          entityId,
          index,
        );

        newEntities.set(entity.parentId, parentEntity);

        setData(
          {
            ...data,
            schema: {
              ...data.schema,
              entities: newEntities,
            },
          },
          [
            {
              name: builderStoreEventsNames.EntityUpdated,
              payload: {
                entity: {
                  ...parentEntity,
                  id: entity.parentId,
                },
              },
            },
          ],
        );

        return;
      }

      const newRoot = new Set(data.schema.root);

      newRoot.delete(entityId);

      setData(
        {
          ...data,
          schema: {
            ...data.schema,
            root: insertIntoSetAtIndex(newRoot, entityId, index),
          },
        },
        [
          {
            name: builderStoreEventsNames.RootUpdated,
            payload: {
              root: newRoot,
            },
          },
        ],
      );
    },
    async validateEntityInput(entityId, inputName) {
      const data = getData();

      const newEntitiesInputsErrors = await validateEntityInput(
        entityId,
        inputName,
        {
          ...options,
          data,
        },
      );

      setData(
        {
          ...data,
          entitiesInputsErrors: newEntitiesInputsErrors,
        },
        [
          createEntityInputErrorUpdatedEvent({
            entityId,
            inputName,
            error: newEntitiesInputsErrors.get(entityId)?.[inputName],
          }),
        ],
      );
    },
    async validateEntityInputs(entityId) {
      const data = getData();

      const { entityInputsErrors, events } = await validateEntityInputs(
        entityId,
        {
          ...options,
          data,
        },
      );

      const newErrors = new Map(data.entitiesInputsErrors);

      newErrors.set(entityId, entityInputsErrors ?? {});

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        events,
      );
    },
    async validateEntitiesInputs() {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      let events: Array<BuilderStoreEvent<TBuilder>> = [];

      for (const entityId of Array.from(data.schema.entities.keys())) {
        const { entityInputsErrors, events: nextEvents } =
          await validateEntityInputs(entityId, {
            builder: options.builder,
            data,
          });

        newErrors.set(entityId, entityInputsErrors ?? {});

        events = events.concat(nextEvents);
      }

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        events,
      );
    },
    resetEntityInputError(entityId, inputName) {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityInputIsRegistered(
        entity.type,
        inputName.toString(),
        options.builder,
      );

      const entityInputsErrors = data.entitiesInputsErrors.get(entityId);

      delete entityInputsErrors?.[inputName];

      newErrors.set(entityId, entityInputsErrors ?? {});

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        [
          createEntityInputErrorUpdatedEvent({
            entityId,
            inputName,
            error: undefined,
          }),
        ],
      );
    },
    setEntityInputError(entityId, inputName, error) {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityInputIsRegistered(
        entity.type,
        inputName.toString(),
        options.builder,
      );

      newErrors.set(entityId, {
        ...data.entitiesInputsErrors.get(entityId),
        [inputName]: error,
      });

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        [
          createEntityInputErrorUpdatedEvent({
            entityId,
            inputName,
            error,
          }),
        ],
      );
    },
    resetEntityInputsErrors(entityId) {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      ensureEntityExists(entityId, data.schema.entities);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      Object.keys(newErrors.get(entityId) ?? {}).forEach((inputName) =>
        events.push(
          createEntityInputErrorUpdatedEvent({
            entityId,
            inputName,
            error: undefined,
          }),
        ),
      );

      newErrors.delete(entityId);

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        events,
      );
    },
    setEntityInputsErrors(entityId, entityInputsErrors) {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityInputsAreRegistered(
        entity.type,
        Object.keys(entityInputsErrors),
        options.builder,
      );

      newErrors.set(entityId, entityInputsErrors);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      Object.entries(entityInputsErrors).forEach(([inputName, error]) =>
        events.push(
          createEntityInputErrorUpdatedEvent({
            entityId,
            inputName,
            error,
          }),
        ),
      );

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        events,
      );
    },
    resetEntitiesInputsErrors() {
      const data = getData();

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      data.entitiesInputsErrors.forEach((entityInputsErrors, entityId) =>
        Object.keys(entityInputsErrors).forEach((inputName) =>
          events.push(
            createEntityInputErrorUpdatedEvent({
              entityId,
              inputName,
              error: undefined,
            }),
          ),
        ),
      );

      setData(
        {
          ...data,
          entitiesInputsErrors: new Map(),
        },
        events,
      );
    },
  };
}

export type BuilderStore<TBuilder extends Builder = Builder> = Store<
  BuilderStoreData<TBuilder>,
  SerializedBuilderStoreData<TBuilder>,
  BuilderStoreEvent<TBuilder>
> & {
  builder: TBuilder;
  getSerializedData(): SerializedBuilderStoreData<TBuilder>;
  addEntity(
    payload: BuilderStoreEntity<TBuilder> & {
      index?: number;
    },
  ): void;
  setEntityParentId(entityId: string, parentId: string, index?: number): void;
  removeEntityParentId(entityId: string, index?: number): void;
  setEntityIndex(entityId: string, index: number): void;
  setEntityInput<
    TInputName extends KeyofUnion<BuilderStoreEntity<TBuilder>["inputs"]>,
  >(
    entityId: string,
    inputName: TInputName,
    inputValue: InputsValues<
      TBuilder["entities"][number]["inputs"]
    >[TInputName],
  ): void;
  deleteEntity(entityId: string): void;
  validateEntityInput<
    TInputName extends KeyofUnion<SchemaEntity<TBuilder>["inputs"]>,
  >(
    entityId: string,
    inputName: TInputName,
  ): Promise<void>;
  validateEntityInputs(entityId: string): Promise<void>;
  validateEntitiesInputs(): Promise<void>;
  resetEntityInputError<
    TInputName extends KeyofUnion<SchemaEntity<TBuilder>["inputs"]>,
  >(
    entityId: string,
    inputName: TInputName,
  ): void;
  setEntityInputError<
    TInputName extends KeyofUnion<SchemaEntity<TBuilder>["inputs"]>,
  >(
    entityId: string,
    inputName: TInputName,
    error?: unknown,
  ): void;
  resetEntityInputsErrors(entityId: string): void;
  setEntityInputsErrors(
    entityId: string,
    entityInputsErrors: EntityInputsErrors<TBuilder>,
  ): void;
  resetEntitiesInputsErrors(): void;
};
