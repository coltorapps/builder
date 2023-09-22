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

export type InputsValidationStoreData<TBuilder extends Builder = Builder> = Map<
  string,
  EntityInputsErrors<TBuilder>
>;

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
  },
): Promise<unknown> {
  const entity = ensureEntityExists(
    entityId,
    dependencies.schemaStore.getData().entities,
  );

  const input = ensureEntityInputIsRegistered(
    entity.type,
    inputName,
    dependencies.schemaStore.builder,
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
  },
): Promise<EntityInputsErrors<TBuilder> | undefined> {
  const newEntitiesInputsErrors = new Map(dependencies.data);

  const entity = ensureEntityExists(
    entityId,
    dependencies.schemaStore.getData().entities,
  );

  const entityDefinition = ensureEntityIsRegistered(
    entity.type,
    dependencies.schemaStore.builder,
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

export function createInputsValidationStore<TBuilder extends Builder>(options: {
  schemaStore: SchemaStore<TBuilder>;
}): InputsValidationStore<TBuilder> {
  const { getData, setData, subscribe } = createDataManager<
    InputsValidationStoreData<TBuilder>
  >(new Map());

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

      const newData = new Map(data);

      newData.set(entityId, {
        ...data.get(entityId),
        [inputName]: inputError,
      });

      setData(newData);
    },
    async validateEntityInputs(entityId) {
      const data = getData();

      const entityInputsErrors = await validateEntityInputs(entityId, {
        ...options,
        data,
      });

      const newData = new Map(data);

      newData.set(entityId, entityInputsErrors ?? {});

      setData(newData);
    },
    async validateEntitiesInputs() {
      const data = getData();

      const newData = new Map(data);

      for (const entityId of Array.from(
        options.schemaStore.getData().entities.keys(),
      )) {
        const entityInputsErrors = await validateEntityInputs(entityId, {
          schemaStore: options.schemaStore,
          data,
        });

        newData.set(entityId, entityInputsErrors ?? {});
      }

      setData(newData);
    },
    resetEntityInputError(entityId, inputName) {
      const data = getData();

      const newData = new Map(data);

      const entity = ensureEntityExists(
        entityId,
        options.schemaStore.getData().entities,
      );

      ensureEntityInputIsRegistered(
        entity.type,
        inputName.toString(),
        options.schemaStore.builder,
      );

      const entityInputsErrors = data.get(entityId);

      delete entityInputsErrors?.[inputName];

      newData.set(entityId, entityInputsErrors ?? {});

      setData(newData);
    },
    setEntityInputError(entityId, inputName, error) {
      const data = getData();

      const newData = new Map(data);

      const entity = ensureEntityExists(
        entityId,
        options.schemaStore.getData().entities,
      );

      ensureEntityInputIsRegistered(
        entity.type,
        inputName.toString(),
        options.schemaStore.builder,
      );

      newData.set(entityId, {
        ...data.get(entityId),
        [inputName]: error,
      });

      setData(newData);
    },
    resetEntityInputsErrors(entityId) {
      const data = getData();

      const newData = new Map(data);

      ensureEntityExists(entityId, options.schemaStore.getData().entities);

      newData.delete(entityId);

      setData(newData);
    },
    setEntityInputsErrors(entityId, entityInputsErrors) {
      const data = getData();

      const newData = new Map(data);

      const entity = ensureEntityExists(
        entityId,
        options.schemaStore.getData().entities,
      );

      ensureEntityInputsAreRegistered(
        entity.type,
        Object.keys(entityInputsErrors),
        options.schemaStore.builder,
      );

      newData.set(entityId, entityInputsErrors);

      setData(newData);
    },
    resetEntitiesInputsErrors() {
      setData(new Map());
    },
    setEntitiesInputsErrors(entitiesInputsErrors) {
      const newData = new Map(Object.entries(entitiesInputsErrors));

      for (const [entityId, inputsErrors] of newData.entries()) {
        const entity = ensureEntityExists(
          entityId,
          options.schemaStore.getData().entities,
        );

        ensureEntityInputsAreRegistered(
          entity.type,
          Object.keys(inputsErrors),
          options.schemaStore.builder,
        );

        newData.set(entityId, inputsErrors);
      }

      setData(newData);
    },
  };
}
