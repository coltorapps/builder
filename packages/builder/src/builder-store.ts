import {
  ensureEntityCanLackParent,
  ensureEntityChildAllowed,
  ensureEntityInputIsRegistered,
  ensureEntityInputsAreRegistered,
  ensureEntityIsRegistered,
  type Builder,
} from "./builder";
import { createDataManager } from "./data-manager";
import {
  createDebounceManager,
  type DebounceManager,
} from "./debounce-manager";
import { type InputsValues } from "./input";
import {
  SchemaValidationError,
  validateSchemaIntegrity,
  type BaseSchemaEntity,
  type EntitiesInputsErrors,
  type EntityInputsErrors,
  type Schema,
  type SchemaEntity,
  type SchemaEntityWithId,
} from "./schema";
import { type Subscribe, type SubscriptionEvent } from "./subscription-manager";
import { insertIntoSetAtIndex, type KeyofUnion } from "./utils";

type InternalBuilderStoreEntity<TBuilder extends Builder = Builder> =
  BaseSchemaEntity<
    TBuilder,
    {
      children?: Set<string>;
    }
  >;

type InternalBuilderStoreEntityWithId<TBuilder extends Builder = Builder> =
  InternalBuilderStoreEntity<TBuilder> & { id: string };

type InternalBuilderStoreData<TBuilder extends Builder = Builder> = {
  schema: {
    entities: Map<string, InternalBuilderStoreEntity<TBuilder>>;
    root: Set<string>;
  };
  entitiesInputsErrors: Map<string, EntityInputsErrors<TBuilder>>;
};

export type BuilderStoreData<TBuilder extends Builder = Builder> = {
  schema: Schema<TBuilder>;
  entitiesInputsErrors: EntitiesInputsErrors<TBuilder>;
};

export const builderStoreEventsNames = {
  EntityAdded: "EntityAdded",
  EntityUpdated: "EntityUpdated",
  EntityInputUpdated: "EntityInputUpdated",
  EntityDeleted: "EntityDeleted",
  EntityCloned: "EntityCloned",
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
        entity: SchemaEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityUpdated,
      {
        entity: SchemaEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityInputUpdated,
      {
        entity: SchemaEntityWithId<TBuilder>;
        inputName: KeyofUnion<SchemaEntity<TBuilder>["inputs"]>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityDeleted,
      {
        entity: SchemaEntityWithId<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof builderStoreEventsNames.EntityCloned,
      {
        entity: SchemaEntityWithId<TBuilder>;
        entityClone: SchemaEntityWithId<TBuilder>;
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
        entity: SchemaEntityWithId<TBuilder>;
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

function ensureEntityExists<TBuilder extends Builder>(
  id: string,
  entities: InternalBuilderStoreData<TBuilder>["schema"]["entities"],
): InternalBuilderStoreEntity<TBuilder> {
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
  data: InternalBuilderStoreData<TBuilder>,
): {
  data: InternalBuilderStoreData<TBuilder>;
  deletedEntities: InternalBuilderStoreEntityWithId<TBuilder>[];
} {
  const entity = ensureEntityExists(entityId, data.schema.entities);

  const newData: InternalBuilderStoreData<TBuilder> = {
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

  let deletedEntities: InternalBuilderStoreEntityWithId<TBuilder>[] = [
    {
      ...entity,
      id: entityId,
    },
  ];

  const childrenDeletionResult = Array.from(entity.children ?? []).reduce<{
    data: InternalBuilderStoreData<TBuilder>;
    deletedEntities: InternalBuilderStoreEntityWithId<TBuilder>[];
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

  childrenDeletionResult.data.entitiesInputsErrors.delete(entityId);

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
    data: InternalBuilderStoreData<TBuilder>;
    schema: Schema<TBuilder>;
    entitiesInputsValidationDebounceManager: DebounceManager<
      InternalBuilderStoreData<TBuilder>["entitiesInputsErrors"]
    >;
  },
): Promise<InternalBuilderStoreData<TBuilder>["entitiesInputsErrors"]> {
  return dependencies.entitiesInputsValidationDebounceManager.handle(
    `${entityId}-${inputName}`,
    async () => {
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
            schema: dependencies.schema,
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
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

      if (
        Object.keys(newEntitiesInputsErrors.get(entityId) ?? {}).length === 0
      ) {
        newEntitiesInputsErrors.delete(entityId);
      }

      return newEntitiesInputsErrors;
    },
    () => dependencies.data.entitiesInputsErrors,
  );
}

function createEntityInputErrorUpdatedEvent<TBuilder extends Builder>(options: {
  entity: SchemaEntityWithId<TBuilder>;
  inputName: string;
  error: unknown;
}): Extract<
  BuilderStoreEvent<TBuilder>,
  { name: typeof builderStoreEventsNames.EntityInputErrorUpdated }
> {
  return {
    name: builderStoreEventsNames.EntityInputErrorUpdated,
    payload: {
      entity: options.entity,
      inputName: options.inputName as KeyofUnion<
        SchemaEntity<TBuilder>["inputs"]
      >,
      error: options.error,
    },
  };
}

async function validateEntityInputs<TBuilder extends Builder>(
  entityId: string,
  dependencies: {
    data: InternalBuilderStoreData<TBuilder>;
    builder: TBuilder;
    entitiesInputsValidationDebounceManager: DebounceManager<
      InternalBuilderStoreData<TBuilder>["entitiesInputsErrors"]
    >;
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

  const schema = serializeInternalBuilderStoreSchema(dependencies.data.schema);

  for (const input of entityDefinition.inputs) {
    newEntitiesInputsErrors = await validateEntityInput(entityId, input.name, {
      ...dependencies,
      schema,
    });

    events.push(
      createEntityInputErrorUpdatedEvent({
        entity: {
          ...serializeInternalBuilderStoreEntity(entity),
          id: entityId,
        },
        inputName: input.name,
        error:
          newEntitiesInputsErrors.get(entityId)?.[
            input.name as keyof EntityInputsErrors<TBuilder>
          ],
      }),
    );
  }

  return {
    entityInputsErrors: newEntitiesInputsErrors.get(entityId),
    events,
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
    throw new Error("Invalid errors format.");
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

function serializeInternalBuilderStoreSchemaRoot<TBuilder extends Builder>(
  root: InternalBuilderStoreData<TBuilder>["schema"]["root"],
): Schema<TBuilder>["root"] {
  return Array.from(root);
}

function serializeInternalBuilderStoreSchema<TBuilder extends Builder>(
  schema: InternalBuilderStoreData<TBuilder>["schema"],
): Schema<TBuilder> {
  const newEntities: BuilderStoreData<TBuilder>["schema"]["entities"] = {};

  for (const [id, entity] of schema.entities) {
    newEntities[id] = serializeInternalBuilderStoreEntity(entity);
  }

  return {
    root: serializeInternalBuilderStoreSchemaRoot(schema.root),
    entities: newEntities,
  };
}

function serializeInternalBuilderStoreData<TBuilder extends Builder>(
  data: InternalBuilderStoreData<TBuilder>,
): BuilderStoreData<TBuilder> {
  return {
    schema: serializeInternalBuilderStoreSchema(data.schema),
    entitiesInputsErrors: Object.fromEntries(data.entitiesInputsErrors),
  };
}

function serializeInternalBuilderStoreEntity<TBuilder extends Builder>(
  entity: InternalBuilderStoreEntity<TBuilder>,
): SchemaEntity<TBuilder> {
  return {
    ...entity,
    ...(entity.children ? { children: Array.from(entity.children) } : {}),
    inputs: entity.inputs,
  };
}

function deserializeEntitiesInputsErrors(
  entitiesInputsErrors: EntitiesInputsErrors,
): InternalBuilderStoreData["entitiesInputsErrors"] {
  return new Map(Object.entries(entitiesInputsErrors));
}

function deserializeBuilderStoreData<TBuilder extends Builder>(
  data: BuilderStoreData<TBuilder>,
): InternalBuilderStoreData<TBuilder> {
  return {
    schema: {
      entities: new Map(
        Object.entries(data.schema.entities).map(([id, entity]) => [
          id,
          {
            ...entity,
            ...(entity.children ? { children: new Set(entity.children) } : {}),
            inputs:
              entity.inputs as unknown as InternalBuilderStoreEntity<TBuilder>["inputs"],
          },
        ]),
      ),
      root: new Set(data.schema.root),
    },
    entitiesInputsErrors: deserializeEntitiesInputsErrors(
      data.entitiesInputsErrors,
    ),
  };
}

function deserializeAndValidateBuilderStoreData<TBuilder extends Builder>(
  data: BuilderStoreData<TBuilder>,
  builder: TBuilder,
): InternalBuilderStoreData<TBuilder> {
  const schemaValidationResult = validateSchemaIntegrity(data.schema, {
    builder,
  });

  if (!schemaValidationResult.success) {
    throw new SchemaValidationError(schemaValidationResult.reason);
  }

  const validatedEntitiesInputsErrors = ensureEntitiesInputsErrorsAreValid(
    data.entitiesInputsErrors,
    {
      entities: schemaValidationResult.data.entities,
      builder,
    },
  );

  return deserializeBuilderStoreData<TBuilder>({
    schema: schemaValidationResult.data,
    entitiesInputsErrors: validatedEntitiesInputsErrors,
  });
}

function getEntityIndex(
  entityId: string,
  dependencies: {
    schema: InternalBuilderStoreData["schema"];
  },
): number {
  const entity = ensureEntityExists(entityId, dependencies.schema.entities);

  if (entity.parentId) {
    const parentEntity = ensureEntityExists(
      entity.parentId,
      dependencies.schema.entities,
    );

    return Array.from(parentEntity.children ?? [entityId]).indexOf(entityId);
  }

  return Array.from(dependencies.schema.root ?? [entityId]).indexOf(entityId);
}

function cloneEntity<TBuilder extends Builder>(
  entity: InternalBuilderStoreEntity<TBuilder> & { index?: number },
  dependencies: {
    schema: InternalBuilderStoreData<TBuilder>["schema"];
    builder: TBuilder;
  },
): {
  schema: InternalBuilderStoreData<TBuilder>["schema"];
  entityClone: InternalBuilderStoreEntityWithId<TBuilder>;
} {
  const { schema, entity: entityClone } = addEntity(entity, {
    builder: dependencies.builder,
    schema: dependencies.schema,
  });

  if (!entity.children) {
    return { schema, entityClone };
  }

  let newSchema = { ...schema };

  entityClone.children = new Set();

  for (const childId of entity.children?.values()) {
    const childEntity = ensureEntityExists(
      childId,
      dependencies.schema.entities,
    );

    const childEntityCloningResult = cloneEntity(
      { ...childEntity, parentId: entityClone.id },
      {
        builder: dependencies.builder,
        schema: newSchema,
      },
    );

    newSchema = childEntityCloningResult.schema;

    entityClone.children.add(childEntityCloningResult.entityClone.id);
  }

  return { schema: newSchema, entityClone };
}

type AddEntityPayload<TBuilder extends Builder = Builder> =
  InternalBuilderStoreEntity<TBuilder> & {
    index?: number;
  };

function addEntity<TBuilder extends Builder>(
  payload: AddEntityPayload<TBuilder>,
  dependencies: {
    schema: InternalBuilderStoreData<TBuilder>["schema"];
    builder: TBuilder;
  },
): {
  schema: InternalBuilderStoreData<TBuilder>["schema"];
  entity: InternalBuilderStoreEntityWithId<TBuilder>;
} {
  const id = dependencies.builder.entityId.generate();

  dependencies.builder.entityId.validate(id);

  if (dependencies.schema.entities.has(id)) {
    throw new Error(`An entitiy with the ID "${id}" already exists.`);
  }

  const newEntity: InternalBuilderStoreEntity<TBuilder> = {
    inputs: payload.inputs,
    type: payload.type,
    parentId: payload?.parentId,
  };

  ensureEntityInputsAreRegistered(
    newEntity.type,
    Object.keys(newEntity.inputs),
    dependencies.builder,
  );

  if (!newEntity.parentId) {
    delete newEntity.parentId;
  }

  const newEntities = new Map(dependencies.schema.entities);

  let newRoot = new Set(dependencies.schema.root);

  newEntities.set(id, newEntity);

  if (!payload?.parentId) {
    newRoot = insertIntoSetAtIndex(newRoot, id, payload?.index);

    ensureEntityCanLackParent(newEntity.type, dependencies.builder);
  } else {
    const parentEntity = ensureEntityExists(
      payload.parentId,
      dependencies.schema.entities,
    );

    ensureEntityChildAllowed(
      parentEntity.type,
      newEntity.type,
      dependencies.builder,
    );

    parentEntity.children = insertIntoSetAtIndex(
      parentEntity.children ?? new Set(),
      id,
      payload?.index,
    );

    newEntities.set(payload.parentId, parentEntity);
  }

  return {
    schema: {
      entities: newEntities,
      root: newRoot,
    },
    entity: { ...newEntity, id },
  };
}

export function createBuilderStore<TBuilder extends Builder>(options: {
  builder: TBuilder;
  initialData?: Partial<BuilderStoreData<TBuilder>>;
}): BuilderStore<TBuilder> {
  const { getData, setData, subscribe } = createDataManager<
    InternalBuilderStoreData<TBuilder>,
    BuilderStoreEvent<TBuilder>
  >(
    deserializeAndValidateBuilderStoreData(
      {
        schema: options.initialData?.schema ?? { entities: {}, root: [] },
        entitiesInputsErrors: options.initialData?.entitiesInputsErrors ?? {},
      },
      options.builder,
    ),
  );

  const entitiesInputsValidationDebounceManager =
    createDebounceManager<
      InternalBuilderStoreData<TBuilder>["entitiesInputsErrors"]
    >();

  return {
    builder: options.builder,
    subscribe(listener) {
      return subscribe((data, events) =>
        listener(serializeInternalBuilderStoreData(data), events),
      );
    },
    getData() {
      return serializeInternalBuilderStoreData(getData());
    },
    setData(data) {
      const newData = deserializeAndValidateBuilderStoreData(
        data,
        options.builder,
      );

      setData(newData, [
        {
          name: builderStoreEventsNames.DataSet,
          payload: {
            data: serializeInternalBuilderStoreData(newData),
          },
        },
      ]);
    },
    addEntity(payload) {
      const data = getData();

      const { schema, entity } = addEntity(payload, {
        builder: options.builder,
        schema: data.schema,
      });

      const events: Array<BuilderStoreEvent<TBuilder>> = [
        {
          name: builderStoreEventsNames.EntityAdded,
          payload: {
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entity.id,
            },
          },
        },
      ];

      if (!payload.parentId) {
        events.push({
          name: builderStoreEventsNames.RootUpdated,
          payload: {
            root: serializeInternalBuilderStoreSchemaRoot(schema.root),
          },
        });
      }

      setData(
        {
          ...data,
          schema,
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
              entity: {
                ...serializeInternalBuilderStoreEntity(oldParentEntity),
                id: entity.parentId,
              },
            },
          });
        }
      } else {
        newRoot.delete(entityId);

        events.push({
          name: builderStoreEventsNames.RootUpdated,
          payload: {
            root: serializeInternalBuilderStoreSchemaRoot(newRoot),
          },
        });
      }

      entity.parentId = parentId;

      newEntities.set(entityId, entity);

      events.push({
        name: builderStoreEventsNames.EntityUpdated,
        payload: {
          entity: {
            ...serializeInternalBuilderStoreEntity(entity),
            id: entityId,
          },
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
          entity: {
            ...serializeInternalBuilderStoreEntity(newParentEntity),
            id: parentId,
          },
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
            entity: {
              ...serializeInternalBuilderStoreEntity(oldParentEntity),
              id: entity.parentId,
            },
          },
        });
      }

      newRoot.delete(entityId);

      events.push({
        name: builderStoreEventsNames.RootUpdated,
        payload: {
          root: serializeInternalBuilderStoreSchemaRoot(newRoot),
        },
      });

      delete entity.parentId;

      newEntities.set(entityId, entity);

      events.push({
        name: builderStoreEventsNames.EntityUpdated,
        payload: {
          entity: {
            ...serializeInternalBuilderStoreEntity(entity),
            id: entityId,
          },
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
              entity: {
                ...serializeInternalBuilderStoreEntity(deletedEntity),
                id: deletedEntity.id,
              },
            },
          });

          if (!deletedEntity.parentId) {
            result.push({
              name: builderStoreEventsNames.RootUpdated,
              payload: {
                root: serializeInternalBuilderStoreSchemaRoot(data.schema.root),
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
                  ...serializeInternalBuilderStoreEntity(parentEntity),
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
              entity: {
                ...serializeInternalBuilderStoreEntity(entity),
                id: entityId,
              },
            },
          },
          {
            name: builderStoreEventsNames.EntityInputUpdated,
            payload: {
              entity: {
                ...serializeInternalBuilderStoreEntity(entity),
                id: entityId,
              },
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
                  ...serializeInternalBuilderStoreEntity(parentEntity),
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
              root: serializeInternalBuilderStoreSchemaRoot(newRoot),
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
          schema: serializeInternalBuilderStoreSchema(data.schema),
          entitiesInputsValidationDebounceManager,
        },
      );

      const entity = ensureEntityExists(entityId, data.schema.entities);

      setData(
        {
          ...data,
          entitiesInputsErrors: newEntitiesInputsErrors,
        },
        [
          createEntityInputErrorUpdatedEvent({
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
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
          entitiesInputsValidationDebounceManager,
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
            entitiesInputsValidationDebounceManager,
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
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
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
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            inputName,
            error,
          }),
        ],
      );
    },
    resetEntityInputsErrors(entityId) {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const events: Array<BuilderStoreEvent<TBuilder>> = [];

      Object.keys(newErrors.get(entityId) ?? {}).forEach((inputName) =>
        events.push(
          createEntityInputErrorUpdatedEvent({
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
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
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
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
              entity: {
                ...serializeInternalBuilderStoreEntity(
                  ensureEntityExists(entityId, data.schema.entities),
                ),
                id: entityId,
              },
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
    setEntitiesInputsErrors(entitiesInputsErrors) {
      const newData = deserializeAndValidateBuilderStoreData(
        {
          schema: serializeInternalBuilderStoreSchema(getData().schema),
          entitiesInputsErrors,
        },
        options.builder,
      );

      setData(newData, [
        {
          name: builderStoreEventsNames.DataSet,
          payload: {
            data: serializeInternalBuilderStoreData(newData),
          },
        },
      ]);
    },
    cloneEntity(entityId) {
      const data = getData();

      const entity = ensureEntityExists(entityId, data.schema.entities);

      const { schema: newSchema, entityClone } = cloneEntity(
        {
          ...entity,
          index: getEntityIndex(entityId, { schema: data.schema }) + 1,
        },
        {
          schema: data.schema,
          builder: options.builder,
        },
      );

      const events: Array<BuilderStoreEvent<TBuilder>> = [
        {
          name: builderStoreEventsNames.EntityCloned,
          payload: {
            entity: {
              ...serializeInternalBuilderStoreEntity(entity),
              id: entityId,
            },
            entityClone: {
              ...serializeInternalBuilderStoreEntity(entityClone),
              id: entityClone.id,
            },
          },
        },
      ];

      if (entity.parentId) {
        events.push({
          name: "EntityUpdated",
          payload: {
            entity: {
              ...serializeInternalBuilderStoreEntity(
                ensureEntityExists(entity.parentId, newSchema.entities),
              ),
              id: entity.parentId,
            },
          },
        });
      } else {
        events.push({
          name: "RootUpdated",
          payload: {
            root: serializeInternalBuilderStoreSchemaRoot(newSchema.root),
          },
        });
      }

      setData(
        {
          ...data,
          schema: newSchema,
        },
        events,
      );
    },
  };
}

export type BuilderStore<TBuilder extends Builder = Builder> = {
  getData(): BuilderStoreData<TBuilder>;
  setData(data: BuilderStoreData<TBuilder>): void;
  subscribe(
    ...args: Parameters<
      Subscribe<BuilderStoreData<TBuilder>, BuilderStoreEvent<TBuilder>>
    >
  ): ReturnType<
    Subscribe<BuilderStoreData<TBuilder>, BuilderStoreEvent<TBuilder>>
  >;
  builder: TBuilder;
  addEntity(
    payload: InternalBuilderStoreEntity<TBuilder> & {
      index?: number;
    },
  ): void;
  setEntityParentId(entityId: string, parentId: string, index?: number): void;
  removeEntityParentId(entityId: string, index?: number): void;
  setEntityIndex(entityId: string, index: number): void;
  setEntityInput<
    TInputName extends KeyofUnion<
      InternalBuilderStoreEntity<TBuilder>["inputs"]
    >,
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
  setEntitiesInputsErrors(
    entitiesInputsErrors: EntitiesInputsErrors<TBuilder>,
  ): void;
  cloneEntity(entityId: string): void;
};
