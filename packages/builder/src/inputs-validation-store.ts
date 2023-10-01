import {
  ensureEntityInputIsRegistered,
  ensureEntityInputsAreRegistered,
  ensureEntityIsRegistered,
  type Builder,
} from "./builder";
import { createDataManager } from "./data-manager";
import {
  type EntitiesInputsErrors,
  type EntityInputsErrors,
  type SchemaEntity,
} from "./schema";
import {
  ensureEntityExists,
  type SchemaStore,
  type SchemaStoreEntity,
} from "./schema-store";
import { type Store } from "./store";
import { type KeyofUnion } from "./utils";

export type InputsValidationStoreData<TBuilder extends Builder = Builder> = {
  entitiesInputsErrors: Map<string, EntityInputsErrors<TBuilder>>;
};

export interface InputsValidationStore<TBuilder extends Builder = Builder>
  extends Store<InputsValidationStoreData<TBuilder>, never> {
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
    entitiesInputsErrors: InputsValidationStoreData<TBuilder>["entitiesInputsErrors"],
  ): void;
}

async function validateEntityInput<TBuilder extends Builder>(
  entityId: string,
  inputName: string,
  dependencies: {
    schemaStore: SchemaStore<TBuilder>;
    builder: TBuilder;
  },
): Promise<unknown> {
  const entity = ensureEntityExists(
    entityId,
    dependencies.schemaStore.getData().entities,
  );

  const input = ensureEntityInputIsRegistered(
    entity.type,
    inputName,
    dependencies.builder,
  );

  try {
    await input.validate((entity as SchemaStoreEntity).inputs[input.name]);

    return undefined;
  } catch (error) {
    return error;
  }
}

async function validateEntityInputs<TBuilder extends Builder>(
  entityId: string,
  dependencies: {
    schemaStore: SchemaStore<TBuilder>;
    data: InputsValidationStoreData<TBuilder>;
    builder: TBuilder;
  },
): Promise<EntityInputsErrors<TBuilder> | undefined> {
  const newEntitiesInputsErrors = new Map(
    dependencies.data.entitiesInputsErrors,
  );

  const entity = ensureEntityExists(
    entityId,
    dependencies.schemaStore.getData().entities,
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

function deserializeEntitiesInputsErrors<TBuilder extends Builder>(
  entitiesInputsErrors: EntitiesInputsErrors<TBuilder>,
): InputsValidationStoreData<TBuilder>["entitiesInputsErrors"] {
  return new Map(Object.entries(entitiesInputsErrors ?? {}));
}

function ensureEntitiesInputsErrorsAreValid<TBuilder extends Builder>(
  entitiesInputsErrors: EntitiesInputsErrors<TBuilder>,
  dependencies: {
    schemaStore: SchemaStore<TBuilder>;
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
    const entity = ensureEntityExists(
      entityId,
      dependencies.schemaStore.getData().entities,
    );

    ensureEntityInputsAreRegistered(
      entity.type,
      Object.keys(inputsErrors),
      dependencies.builder,
    );

    newEntitiesInputsErrors[entityId] = inputsErrors;
  }

  return newEntitiesInputsErrors;
}

export function createInputsValidationStore<TBuilder extends Builder>(options: {
  schemaStore: SchemaStore<TBuilder>;
  builder: TBuilder;
  entitiesInputsErrors?: EntitiesInputsErrors<TBuilder>;
}): InputsValidationStore<TBuilder> {
  const validatedErrors = ensureEntitiesInputsErrorsAreValid(
    options.entitiesInputsErrors ?? {},
    options,
  );

  const { getData, setData, subscribe } = createDataManager<
    InputsValidationStoreData<TBuilder>,
    never
  >({
    entitiesInputsErrors: deserializeEntitiesInputsErrors(validatedErrors),
  });

  return {
    subscribe,
    getData,
    async validateEntityInput(entityId, inputName) {
      const data = getData();

      const inputError = await validateEntityInput(
        entityId,
        inputName.toString(),
        options,
      );

      const newErrors = new Map(data.entitiesInputsErrors);

      newErrors.set(entityId, {
        ...data.entitiesInputsErrors.get(entityId),
        [inputName]: inputError,
      });

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        [],
      );
    },
    async validateEntityInputs(entityId) {
      const data = getData();

      const entityInputsErrors = await validateEntityInputs(entityId, {
        ...options,
        data,
      });

      const newErrors = new Map(data.entitiesInputsErrors);

      newErrors.set(entityId, entityInputsErrors ?? {});

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        [],
      );
    },
    async validateEntitiesInputs() {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      for (const entityId of Array.from(
        options.schemaStore.getData().entities.keys(),
      )) {
        const entityInputsErrors = await validateEntityInputs(entityId, {
          schemaStore: options.schemaStore,
          builder: options.builder,
          data,
        });

        newErrors.set(entityId, entityInputsErrors ?? {});
      }

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        [],
      );
    },
    resetEntityInputError(entityId, inputName) {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(
        entityId,
        options.schemaStore.getData().entities,
      );

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
        [],
      );
    },
    setEntityInputError(entityId, inputName, error) {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(
        entityId,
        options.schemaStore.getData().entities,
      );

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
        [],
      );
    },
    resetEntityInputsErrors(entityId) {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      ensureEntityExists(entityId, options.schemaStore.getData().entities);

      newErrors.delete(entityId);

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        [],
      );
    },
    setEntityInputsErrors(entityId, entityInputsErrors) {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      const entity = ensureEntityExists(
        entityId,
        options.schemaStore.getData().entities,
      );

      ensureEntityInputsAreRegistered(
        entity.type,
        Object.keys(entityInputsErrors),
        options.builder,
      );

      newErrors.set(entityId, entityInputsErrors);

      setData(
        {
          ...data,
          entitiesInputsErrors: newErrors,
        },
        [],
      );
    },
    resetEntitiesInputsErrors() {
      setData(
        {
          ...getData(),
          entitiesInputsErrors: new Map(),
        },
        [],
      );
    },
    setEntitiesInputsErrors(entitiesInputsErrors) {
      const validatedErrors = ensureEntitiesInputsErrorsAreValid(
        Object.fromEntries(entitiesInputsErrors),
        options,
      );

      setData(
        {
          ...getData(),
          entitiesInputsErrors:
            deserializeEntitiesInputsErrors(validatedErrors),
        },
        [],
      );
    },
  };
}
