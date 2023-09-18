import { type Builder } from "./builder";
import { createDataManager } from "./data-manager";
import { type Input, type InputsValues } from "./input";
import {
  validateSchemaIntegrity,
  type EntitiesInputsErrors,
  type EntityInputsErrors,
  type Schema,
  type SchemaEntity,
} from "./schema";
import {
  createSubscriptionManager,
  type Subscribe,
} from "./subscription-manager";
import {
  entityParentRequired,
  getEntityDefinition,
  insertIntoSetAtIndex,
  isEntityChildAllowed,
  type KeyofUnion,
} from "./utils";

export type StoreEntity<TBuilder extends Builder = Builder> = Pick<
  SchemaEntity<TBuilder>,
  "type" | "inputs" | "parentId"
> & { children?: Set<string>; updatedAt?: Date };

export type StoreEntityWithId<TBuilder extends Builder = Builder> =
  StoreEntity<TBuilder> & { id: string };

export type StoreEntitiesInputsErrors<TBuilder extends Builder> = Map<
  string,
  EntityInputsErrors<TBuilder>
>;

export interface StoreData<TBuilder extends Builder = Builder> {
  schema: {
    entities: Map<string, StoreEntity<TBuilder>>;
    root: Set<string>;
  };
  entitiesInputsErrors: Map<string, EntityInputsErrors<TBuilder>>;
  activeEntityId: string | null;
}

export const storeEventsNames = {
  EntityAdded: "EntityAdded",
  EntityUpdated: "EntityUpdated",
  EntityDeleted: "EntityDeleted",
} as const;

export type StoreEventName =
  (typeof storeEventsNames)[keyof typeof storeEventsNames];

export type StoreEvent<TBuilder extends Builder = Builder> =
  | {
      name: typeof storeEventsNames.EntityAdded;
      payload: {
        entity: StoreEntityWithId<TBuilder>;
        meta?: AddEntityMutationFields;
      };
    }
  | {
      name: typeof storeEventsNames.EntityUpdated;
      payload: {
        entity: StoreEntityWithId<TBuilder>;
        meta?: UpdateEntityMutationFields;
      };
    }
  | {
      name: typeof storeEventsNames.EntityDeleted;
      payload: {
        entity: StoreEntityWithId<TBuilder>;
      };
    };

interface AddEntityMutationFields {
  index?: number;
  parentId?: string;
}

interface UpdateEntityMutationFields {
  index?: number;
  parentId?: string | null;
}

export interface Store<TBuilder extends Builder = Builder> {
  builder: TBuilder;
  getData(): StoreData<TBuilder>;
  subscribe(
    ...args: Parameters<Subscribe<StoreData<TBuilder>>>
  ): ReturnType<Subscribe<StoreData<TBuilder>>>;
  subscribeToEvents(
    ...args: Parameters<Subscribe<StoreEvent<TBuilder>>>
  ): ReturnType<Subscribe<StoreEvent<TBuilder>>>;
  getSerializedSchema(): Schema<TBuilder>;
  addEntity(
    entity: StoreEntity<TBuilder>,
    mutationFields?: AddEntityMutationFields,
  ): void;
  updateEntity(
    entityId: string,
    mutationFields: UpdateEntityMutationFields,
  ): void;
  setEntityInput<
    TInputName extends KeyofUnion<StoreEntity<TBuilder>["inputs"]>,
  >(
    entityId: string,
    inputName: TInputName,
    inputValue: InputsValues<
      TBuilder["entities"][number]["inputs"]
    >[TInputName],
  ): void;
  deleteEntity(entityId: string): void;
  validateEntityInput<
    TInputName extends KeyofUnion<StoreEntity<TBuilder>["inputs"]>,
  >(
    entityId: string,
    inputName: TInputName,
  ): Promise<void>;
  validateEntityInputs(
    entityId: string,
  ): Promise<EntityInputsErrors<TBuilder> | undefined>;
  validateEntitiesInputs(): Promise<StoreEntitiesInputsErrors<TBuilder>>;
  setActiveEntityId(activeEntityId: StoreData["activeEntityId"]): void;
  resetEntityInputError<
    TInputName extends KeyofUnion<StoreEntity<TBuilder>["inputs"]>,
  >(
    entityId: string,
    inputName: TInputName,
  ): void;
  setEntityInputError<
    TInputName extends KeyofUnion<StoreEntity<TBuilder>["inputs"]>,
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
  setEntitiesInputsErrors(
    entitiesInputsErrors: EntitiesInputsErrors<TBuilder>,
  ): void;
}

function serializeSchema<TBuilder extends Builder>(
  data: StoreData<TBuilder>,
): Schema<TBuilder> {
  const newEntities: Schema<TBuilder>["entities"] = {};

  for (const [id, entity] of data.schema.entities) {
    const { children, ...entityData } = entity;

    newEntities[id] = {
      ...entityData,
      ...(children ? { children: Array.from(children) } : {}),
    };
  }

  return {
    root: Array.from(data.schema.root),
    entities: newEntities,
  };
}

function deserializeSchema<TBuilder extends Builder>(
  schema: Schema<TBuilder>,
): StoreData<TBuilder>["schema"] {
  return {
    entities: new Map(
      Object.entries(schema.entities).map(([id, entity]) => [
        id,
        {
          ...entity,
          ...(entity.children ? { children: new Set(entity.children) } : {}),
        },
      ]),
    ),
    root: new Set(schema.root),
  };
}

function ensureEntityExists<TBuilder extends Builder>(
  id: string,
  entities: StoreData<TBuilder>["schema"]["entities"],
): StoreEntity<TBuilder> {
  const entity = entities.get(id);

  if (!entity) {
    throw new Error(`Entity with ID "${id}" was not found.`);
  }

  return entity;
}

function ensureEntityIsRegistered(
  entityType: string,
  builder: Builder,
): Builder["entities"][number] {
  const entityDefinition = getEntityDefinition(entityType, builder);

  if (!entityDefinition) {
    throw new Error(`Unkown entity type "${entityType}".`);
  }

  return entityDefinition;
}

function ensureEntityChildAllowed(
  entityType: string,
  childEntityType: string,
  builder: Builder,
): void {
  if (!isEntityChildAllowed(entityType, childEntityType, builder)) {
    throw new Error("Child is not allowed.");
  }
}

function ensureEntityCanLackParent(entityType: string, builder: Builder): void {
  if (entityParentRequired(entityType, builder)) {
    throw new Error("A parent is required.");
  }
}

function deleteEntity<TBuilder extends Builder>(
  entityId: string,
  data: StoreData<TBuilder>,
  onDelete: (entity: StoreEntityWithId<TBuilder>) => void,
): StoreData<TBuilder> {
  const entity = ensureEntityExists(entityId, data.schema.entities);

  let newData: StoreData<TBuilder> = {
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

    parentEntity.updatedAt = new Date();

    newData.schema.entities.set(entity.parentId, parentEntity);
  }

  newData = Array.from(entity.children ?? []).reduce(
    (result, childId) => deleteEntity(childId, result, onDelete),
    newData,
  );

  newData.schema.entities.delete(entityId);

  onDelete({ ...entity, id: entityId });

  newData.entitiesInputsErrors.delete(entityId);

  if (data.activeEntityId === entityId) {
    newData.activeEntityId = null;
  }

  return newData;
}

function ensureEntityInputIsRegistered(
  entityType: string,
  inputName: string,
  builder: Builder,
): Input {
  const entityDefinition = ensureEntityIsRegistered(entityType, builder);

  const input = entityDefinition.inputs.find(
    (input) => input.name === inputName,
  );

  if (!input) {
    throw new Error(`Unkown entity input "${inputName}".`);
  }

  return input;
}

function ensureEntityInputsAreRegistered(
  entityType: string,
  inputNames: Array<string>,
  builder: Builder,
): Array<Input> {
  const inputs = inputNames.map((inputName) =>
    ensureEntityInputIsRegistered(entityType, inputName, builder),
  );

  return inputs;
}

async function validateEntityInput<TBuilder extends Builder>(
  entityId: string,
  inputName: string,
  dependencies: { data: StoreData<TBuilder>; builder: TBuilder },
): Promise<unknown> {
  const entity = ensureEntityExists(
    entityId,
    dependencies.data.schema.entities,
  );

  const input = ensureEntityInputIsRegistered(
    entity.type,
    inputName,
    dependencies.builder,
  );

  try {
    await input.validate((entity as StoreEntity).inputs[input.name]);

    return undefined;
  } catch (error) {
    return error;
  }
}

async function validateEntityInputs<TBuilder extends Builder>(
  entityId: string,
  dependencies: { data: StoreData<TBuilder>; builder: TBuilder },
): Promise<EntityInputsErrors<TBuilder> | undefined> {
  const newEntitiesInputsErrors = new Map(
    dependencies.data.entitiesInputsErrors,
  );

  const entity = ensureEntityExists(
    entityId,
    dependencies.data.schema.entities,
  );

  const entityDefinition = ensureEntityIsRegistered(
    entity.type,
    dependencies.builder,
  );

  for (const input of entityDefinition.inputs) {
    const inputError = await validateEntityInput(
      entityId,
      input.name,
      dependencies,
    );

    newEntitiesInputsErrors.set(entityId, {
      ...newEntitiesInputsErrors.get(entityId),
      [input.name]: inputError,
    });
  }

  return newEntitiesInputsErrors.get(entityId);
}

export function createStore<TBuilder extends Builder>(
  builder: TBuilder,
  options?: { schema?: Schema<TBuilder> },
): Store<TBuilder> {
  const validatedSchema = validateSchemaIntegrity(builder, options?.schema);

  if (!validatedSchema.success) {
    throw validatedSchema.error;
  }

  const { getData, setData, subscribe } = createDataManager<
    StoreData<TBuilder>
  >({
    schema: deserializeSchema(validatedSchema.data),
    entitiesInputsErrors: new Map(),
    activeEntityId: null,
  });

  const { subscribe: subscribeToEvents, notify: notifyEventsListeners } =
    createSubscriptionManager<StoreEvent<TBuilder>>();

  return {
    builder,
    subscribe,
    subscribeToEvents,
    getData,
    getSerializedSchema() {
      return serializeSchema(getData());
    },
    addEntity(entity, mutationFields) {
      const data = getData();

      const entityId = builder.entityId.generate();

      builder.entityId.validate(entityId);

      if (data.schema.entities.has(entityId)) {
        throw new Error(`An entitiy with the ID "${entityId}" already exists.`);
      }

      const newEntity: StoreEntity<TBuilder> = {
        inputs: entity.inputs,
        type: entity.type,
        parentId: mutationFields?.parentId,
      };

      ensureEntityInputsAreRegistered(
        newEntity.type,
        Object.keys(newEntity.inputs),
        builder,
      );

      if (!newEntity.parentId) {
        delete newEntity.parentId;
      }

      const newEntities = new Map(data.schema.entities);

      let newRoot = new Set(data.schema.root);

      newEntities.set(entityId, newEntity);

      if (!mutationFields?.parentId) {
        newRoot = insertIntoSetAtIndex(
          newRoot,
          entityId,
          mutationFields?.index,
        );

        ensureEntityCanLackParent(newEntity.type, builder);
      } else {
        const parentEntity = ensureEntityExists(
          mutationFields.parentId,
          data.schema.entities,
        );

        ensureEntityChildAllowed(parentEntity.type, newEntity.type, builder);

        parentEntity.children = insertIntoSetAtIndex(
          parentEntity.children ?? new Set(),
          entityId,
          mutationFields?.index,
        );

        parentEntity.updatedAt = new Date();

        newEntities.set(mutationFields.parentId, parentEntity);
      }

      setData({
        ...data,
        schema: {
          root: newRoot,
          entities: newEntities,
        },
      });

      notifyEventsListeners({
        name: storeEventsNames.EntityAdded,
        payload: {
          entity: { ...newEntity, id: entityId },
          meta: mutationFields,
        },
      });
    },
    updateEntity(entityId, mutationFields) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      if (
        mutationFields.index === undefined &&
        mutationFields.parentId === undefined
      ) {
        return data;
      }

      const newEntities = new Map(data.schema.entities);

      let newRoot = new Set(data.schema.root);

      const newParentEntityId =
        mutationFields.parentId === null
          ? undefined
          : mutationFields.parentId ?? entity.parentId;

      const newEntity: StoreEntity<TBuilder> = {
        ...entity,
        parentId: newParentEntityId,
        updatedAt: new Date(),
      };

      if (!newEntity.parentId) {
        delete newEntity.parentId;
      }

      newEntities.set(entityId, newEntity);

      newRoot.delete(entityId);

      if (entity.parentId) {
        const parentEntity = ensureEntityExists(
          entity.parentId,
          data.schema.entities,
        );

        parentEntity.children?.delete(entityId);

        parentEntity.updatedAt = new Date();

        newEntities.set(entity.parentId, parentEntity);
      }

      if (mutationFields.parentId === null || !newParentEntityId) {
        newRoot = insertIntoSetAtIndex(
          newRoot,
          entityId,
          mutationFields?.index,
        );

        ensureEntityCanLackParent(newEntity.type, builder);
      } else if (newParentEntityId) {
        const parentEntity = ensureEntityExists(
          newParentEntityId,
          data.schema.entities,
        );

        ensureEntityChildAllowed(parentEntity.type, newEntity.type, builder);

        parentEntity.children = insertIntoSetAtIndex(
          parentEntity.children ?? new Set(),
          entityId,
          mutationFields?.index,
        );

        parentEntity.updatedAt = new Date();

        newEntities.set(newParentEntityId, parentEntity);
      }

      setData({
        ...data,
        schema: {
          root: newRoot,
          entities: newEntities,
        },
      });

      notifyEventsListeners({
        name: storeEventsNames.EntityUpdated,
        payload: {
          entity: { ...newEntity, id: entityId },
          meta: mutationFields,
        },
      });
    },
    deleteEntity(entityId) {
      const data = getData();

      setData(
        deleteEntity(entityId, data, (deletedEntity) =>
          notifyEventsListeners({
            name: storeEventsNames.EntityDeleted,
            payload: {
              entity: deletedEntity,
            },
          }),
        ),
      );
    },
    setEntityInput(entityId, inputName, inputValue) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityInputIsRegistered(entity.type, inputName.toString(), builder);

      entity.updatedAt = new Date();

      entity.inputs = {
        ...entity.inputs,
        [inputName]: inputValue,
      };

      return setData({
        ...data,
        schema: {
          root: data.schema.root,
          entities: data.schema.entities.set(entityId, entity),
        },
      });
    },
    async validateEntityInput(entityId, inputName) {
      const data = getData();

      const inputError = await validateEntityInput(
        entityId,
        inputName.toString(),
        {
          builder,
          data,
        },
      );

      const newEntitiesInputsErrors = new Map(data.entitiesInputsErrors);

      newEntitiesInputsErrors.set(entityId, {
        ...newEntitiesInputsErrors.get(entityId),
        [inputName]: inputError,
      });

      setData({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      });
    },
    async validateEntityInputs(entityId) {
      const data = getData();

      const entityInputsErrors = await validateEntityInputs(entityId, {
        builder,
        data,
      });

      const newEntitiesInputsErrors = new Map(data.entitiesInputsErrors);

      newEntitiesInputsErrors.set(entityId, entityInputsErrors ?? {});

      setData({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      });

      return entityInputsErrors;
    },
    async validateEntitiesInputs() {
      const data = getData();

      const newEntitiesInputsErrors = new Map(data.entitiesInputsErrors);

      for (const [entityId] of data.schema.entities) {
        const entityInputsErrors = await validateEntityInputs(entityId, {
          builder,
          data,
        });

        newEntitiesInputsErrors.set(entityId, entityInputsErrors ?? {});
      }

      setData({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      });

      return newEntitiesInputsErrors;
    },
    setActiveEntityId(activeEntityId) {
      const data = getData();

      if (activeEntityId) {
        ensureEntityExists(activeEntityId, data.schema.entities);
      }

      setData({
        ...data,
        activeEntityId: activeEntityId,
      });
    },
    resetEntityInputError(entityId, inputName) {
      const data = getData();

      const newEntitiesInputsErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityInputIsRegistered(entity.type, inputName.toString(), builder);

      const entityInputsErrors = data.entitiesInputsErrors.get(entityId);

      delete entityInputsErrors?.[inputName];

      newEntitiesInputsErrors.set(entityId, entityInputsErrors ?? {});

      setData({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      });
    },
    setEntityInputError(entityId, inputName, error) {
      const data = getData();

      const newEntitiesInputsErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityInputIsRegistered(entity.type, inputName.toString(), builder);

      newEntitiesInputsErrors.set(entityId, {
        ...data.entitiesInputsErrors.get(entityId),
        [inputName]: error,
      });

      setData({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      });
    },
    resetEntityInputsErrors(entityId) {
      const data = getData();

      const newEntitiesInputsErrors = new Map(data.entitiesInputsErrors);

      ensureEntityExists(entityId, data.schema.entities);

      newEntitiesInputsErrors.delete(entityId);

      setData({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      });
    },
    setEntityInputsErrors(entityId, entityInputsErrors) {
      const data = getData();

      const newEntitiesInputsErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      ensureEntityInputsAreRegistered(
        entity.type,
        Object.keys(entityInputsErrors),
        builder,
      );

      newEntitiesInputsErrors.set(entityId, entityInputsErrors);

      setData({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      });
    },
    resetEntitiesInputsErrors() {
      const data = getData();

      setData({
        ...data,
        entitiesInputsErrors: new Map(),
      });
    },
    setEntitiesInputsErrors(entitiesInputsErrors) {
      const data = getData();

      const newEntitiesInputsErrors = new Map(
        Object.entries(entitiesInputsErrors),
      );

      for (const [
        entityId,
        inputsErrors,
      ] of newEntitiesInputsErrors.entries()) {
        const entity = ensureEntityExists(entityId, data.schema.entities);

        ensureEntityInputsAreRegistered(
          entity.type,
          Object.keys(inputsErrors),
          builder,
        );

        newEntitiesInputsErrors.set(entityId, inputsErrors);
      }

      setData({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      });
    },
  };
}
