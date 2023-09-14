import { type Builder } from "./builder";
import { createDataManager } from "./data-manager";
import {
  validateSchemaIntegrity,
  type EntityInputsErrors,
  type Schema,
  type SchemaEntity,
} from "./schema";
import { type Subscribe } from "./subscription-manager";
import { getEntityDefinition, insertIntoSetAtIndex } from "./utils";

type StoreEntity<TBuilder extends Builder = Builder> = Pick<
  SchemaEntity<TBuilder>,
  "type" | "inputs" | "parentId"
> & { children?: Set<string> };

export interface StoreData<TBuilder extends Builder = Builder> {
  schema: {
    entities: Map<string, StoreEntity<TBuilder>>;
    root: Set<string>;
  };
  entitiesInputsErrors: Map<string, EntityInputsErrors<TBuilder>>;
  activeEntityId: string | null;
}

export interface Store<TBuilder extends Builder> {
  builder: TBuilder;
  getData(): StoreData<TBuilder>;
  subscribe: Subscribe<StoreData<TBuilder>>;
  getSerializedSchema(): Schema<TBuilder>;
  addEntity(
    entity: StoreEntity<TBuilder>,
    mutationFields?: {
      index?: number;
      parentId?: string;
    },
  ): void;
  updateEntity(
    entityId: string,
    mutationFields: {
      index?: number;
      parentId?: string | null;
    },
  ): void;
  updateEntityInput<TInputName extends keyof StoreEntity<TBuilder>["inputs"]>(
    entityId: string,
    inputName: TInputName,
    inputValue: StoreEntity<TBuilder>["inputs"][TInputName],
  ): void;
  deleteEntity(entityId: string): void;
  validateEntityInput<TInputName extends keyof StoreEntity<TBuilder>["inputs"]>(
    entityId: string,
    inputName: TInputName,
  ): Promise<void>;
  validateEntityInputs(
    entityId: string,
  ): Promise<EntityInputsErrors<TBuilder> | undefined>;
  validateEntitiesInputs(): Promise<
    StoreData<TBuilder>["entitiesInputsErrors"]
  >;
  setActiveEntityId(entityId: StoreData["activeEntityId"]): void;
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

function deleteEntity<TBuilder extends Builder>(
  entityId: string,
  data: StoreData<TBuilder>,
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

    newData.schema.entities.set(entity.parentId, parentEntity);
  }

  newData = Array.from(entity.children ?? []).reduce(
    (result, childId) => deleteEntity(childId, result),
    newData,
  );

  newData.schema.entities.delete(entityId);

  newData.entitiesInputsErrors.delete(entityId);

  if (data.activeEntityId === entityId) {
    newData.activeEntityId = null;
  }

  return newData;
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

  const entityDefinition = ensureEntityIsRegistered(
    entity.type,
    dependencies.builder,
  );

  const input = entityDefinition.inputs.find(
    (input) => input.name === inputName,
  );

  if (!input) {
    throw new Error(`Unkown entity input "${inputName}".`);
  }

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

  return {
    builder,
    subscribe,
    getData,
    getSerializedSchema() {
      return serializeSchema(getData());
    },
    addEntity(entity, mutationFields) {
      setData((data) => {
        const entityId = builder.entityId.generate();

        builder.entityId.validate(entityId);

        const newEntity: StoreEntity<TBuilder> = {
          inputs: entity.inputs,
          type: entity.type,
          parentId: mutationFields?.parentId,
        };

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
        } else {
          const parentEntity = ensureEntityExists(
            mutationFields.parentId,
            data.schema.entities,
          );

          parentEntity.children = insertIntoSetAtIndex(
            parentEntity.children ?? new Set(),
            entityId,
            mutationFields?.index,
          );

          newEntities.set(mutationFields.parentId, parentEntity);
        }

        return {
          ...data,
          schema: {
            root: newRoot,
            entities: newEntities,
          },
        };
      });
    },
    updateEntity(entityId, mutationFields) {
      setData((data) => {
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

        const newEntity = {
          ...entity,
          parentId: newParentEntityId,
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

          newEntities.set(entity.parentId, parentEntity);
        }

        if (mutationFields.parentId === null || !newParentEntityId) {
          newRoot = insertIntoSetAtIndex(
            newRoot,
            entityId,
            mutationFields?.index,
          );
        } else if (newParentEntityId) {
          const parentEntity = ensureEntityExists(
            newParentEntityId,
            data.schema.entities,
          );

          parentEntity.children = insertIntoSetAtIndex(
            parentEntity.children ?? new Set(),
            entityId,
            mutationFields?.index,
          );

          newEntities.set(newParentEntityId, parentEntity);
        }

        return {
          ...data,
          schema: {
            root: newRoot,
            entities: newEntities,
          },
        };
      });
    },
    deleteEntity(entityId) {
      setData((data) => {
        return deleteEntity(entityId, data);
      });
    },
    updateEntityInput(entityId, inputName, inputValue) {
      setData((data) => {
        const entity = ensureEntityExists(entityId, data.schema.entities);

        const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

        if (
          !entityDefinition.inputs.some((input) => input.name === inputName)
        ) {
          throw new Error(`Unkown entity input "${inputName.toString()}".`);
        }

        entity.inputs[inputName] = inputValue;

        return {
          ...data,
          schema: {
            root: data.schema.root,
            entities: data.schema.entities.set(entityId, entity),
          },
        };
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

      setData(() => ({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      }));
    },
    async validateEntityInputs(entityId) {
      const data = getData();

      const entityInputsErrors = await validateEntityInputs(entityId, {
        builder,
        data,
      });

      const newEntitiesInputsErrors = new Map(data.entitiesInputsErrors);

      newEntitiesInputsErrors.set(entityId, entityInputsErrors ?? {});

      setData(() => ({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      }));

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

      setData((data) => ({
        ...data,
        entitiesInputsErrors: newEntitiesInputsErrors,
      }));

      return newEntitiesInputsErrors;
    },
    setActiveEntityId(entityId) {
      setData((data) => {
        if (entityId) {
          ensureEntityExists(entityId, data.schema.entities);
        }

        return {
          ...data,
          activeEntityId: entityId,
        };
      });
    },
  };
}
