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
  errors: Map<string, EntityInputsErrors<TBuilder>>;
};

export interface InputsValidationStore<TBuilder extends Builder = Builder>
  extends Store<InputsValidationStoreData<TBuilder>> {
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
  const newEntitiesInputsErrors = new Map(dependencies.data.errors);

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
  entitiesInputsErrors?: EntitiesInputsErrors<TBuilder>,
): InputsValidationStoreData<TBuilder>["errors"] {
  return new Map(Object.entries(entitiesInputsErrors ?? {}));
}

function ensureEntitiesInputsErrorsAreValid<TBuilder extends Builder>(
  entitiesInputsErrors: InputsValidationStoreData<TBuilder>["errors"],
  dependencies: {
    schemaStore: SchemaStore<TBuilder>;
    builder: TBuilder;
  },
): InputsValidationStoreData<TBuilder>["errors"] {
  const newErrors = new Map(entitiesInputsErrors);

  for (const [entityId, inputsErrors] of newErrors.entries()) {
    const entity = ensureEntityExists(
      entityId,
      dependencies.schemaStore.getData().entities,
    );

    ensureEntityInputsAreRegistered(
      entity.type,
      Object.keys(inputsErrors),
      dependencies.builder,
    );

    newErrors.set(entityId, inputsErrors);
  }

  return newErrors;
}

export function createInputsValidationStore<TBuilder extends Builder>(options: {
  schemaStore: SchemaStore<TBuilder>;
  builder: TBuilder;
  errors?: EntitiesInputsErrors<TBuilder>;
}): InputsValidationStore<TBuilder> {
  const { getData, setData, subscribe } = createDataManager<
    InputsValidationStoreData<TBuilder>
  >({
    errors: ensureEntitiesInputsErrorsAreValid(
      deserializeEntitiesInputsErrors(options.errors),
      options,
    ),
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

      const newErrors = new Map(data.errors);

      newErrors.set(entityId, {
        ...data.errors.get(entityId),
        [inputName]: inputError,
      });

      setData({
        ...data,
        errors: newErrors,
      });
    },
    async validateEntityInputs(entityId) {
      const data = getData();

      const entityInputsErrors = await validateEntityInputs(entityId, {
        ...options,
        data,
      });

      const newErrors = new Map(data.errors);

      newErrors.set(entityId, entityInputsErrors ?? {});

      setData({
        ...data,
        errors: newErrors,
      });
    },
    async validateEntitiesInputs() {
      const data = getData();

      const newErrors = new Map(data.errors);

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

      setData({
        ...data,
        errors: newErrors,
      });
    },
    resetEntityInputError(entityId, inputName) {
      const data = getData();

      const newErrors = new Map(data.errors);

      const entity = ensureEntityExists(
        entityId,
        options.schemaStore.getData().entities,
      );

      ensureEntityInputIsRegistered(
        entity.type,
        inputName.toString(),
        options.builder,
      );

      const entityInputsErrors = data.errors.get(entityId);

      delete entityInputsErrors?.[inputName];

      newErrors.set(entityId, entityInputsErrors ?? {});

      setData({
        ...data,
        errors: newErrors,
      });
    },
    setEntityInputError(entityId, inputName, error) {
      const data = getData();

      const newErrors = new Map(data.errors);

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
        ...data.errors.get(entityId),
        [inputName]: error,
      });

      setData({
        ...data,
        errors: newErrors,
      });
    },
    resetEntityInputsErrors(entityId) {
      const data = getData();

      const newErrors = new Map(data.errors);

      ensureEntityExists(entityId, options.schemaStore.getData().entities);

      newErrors.delete(entityId);

      setData({
        ...data,
        errors: newErrors,
      });
    },
    setEntityInputsErrors(entityId, entityInputsErrors) {
      const data = getData();

      const newErrors = new Map(data.errors);

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

      setData({
        ...data,
        errors: newErrors,
      });
    },
    resetEntitiesInputsErrors() {
      setData({
        ...getData(),
        errors: new Map(),
      });
    },
    setEntitiesInputsErrors(entitiesInputsErrors) {
      setData({
        ...getData(),
        errors: ensureEntitiesInputsErrorsAreValid(
          deserializeEntitiesInputsErrors(entitiesInputsErrors),
          options,
        ),
      });
    },
  };
}
