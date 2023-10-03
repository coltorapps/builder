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
import { type SubscriptionEvent } from "./subscription-manager";
import { type KeyofUnion } from "./utils";

export type InputsValidationStoreData<TBuilder extends Builder = Builder> = {
  entitiesInputsErrors: Map<string, EntityInputsErrors<TBuilder>>;
};

export type SerializedInputsValidationStoreData<
  TBuilder extends Builder = Builder,
> = {
  entitiesInputsErrors: EntitiesInputsErrors<TBuilder>;
};

export const inputsValidationStoreEventsNames = {
  DataSet: "DataSet",
  EntityInputErrorUpdated: "EntityInputErrorUpdated",
} as const;

export type InputsValidationStoreEventName =
  (typeof inputsValidationStoreEventsNames)[keyof typeof inputsValidationStoreEventsNames];

export type InputsValidationStoreEvent<TBuilder extends Builder = Builder> =
  | SubscriptionEvent<
      typeof inputsValidationStoreEventsNames.DataSet,
      {
        data: InputsValidationStoreData<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof inputsValidationStoreEventsNames.EntityInputErrorUpdated,
      {
        entityId: string;
        inputName: KeyofUnion<SchemaEntity<TBuilder>["inputs"]>;
        error: unknown;
      }
    >;

export interface InputsValidationStore<TBuilder extends Builder = Builder>
  extends Store<
    InputsValidationStoreData<TBuilder>,
    SerializedInputsValidationStoreData<TBuilder>,
    InputsValidationStoreEvent<TBuilder>
  > {
  getSerializedData(): SerializedInputsValidationStoreData;
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
}

async function validateEntityInput<TBuilder extends Builder>(
  entityId: string,
  inputName: string,
  dependencies: {
    schemaStore: SchemaStore<TBuilder>;
    builder: TBuilder;
    entitiesInputsErrors: InputsValidationStoreData<TBuilder>["entitiesInputsErrors"];
  },
): Promise<InputsValidationStoreData<TBuilder>["entitiesInputsErrors"]> {
  const entity = ensureEntityExists(
    entityId,
    dependencies.schemaStore.getData().entities,
  );

  const input = ensureEntityInputIsRegistered(
    entity.type,
    inputName,
    dependencies.builder,
  );

  const newEntitiesInputsErrors = new Map(dependencies.entitiesInputsErrors);

  const entityInputsErrors: EntityInputsErrors<TBuilder> = {
    ...newEntitiesInputsErrors.get(entityId),
  };

  try {
    await input.validate((entity as SchemaStoreEntity).inputs[input.name]);

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
    schemaStore: SchemaStore<TBuilder>;
    data: InputsValidationStoreData<TBuilder>;
    builder: TBuilder;
  },
): Promise<{
  entityInputsErrors: EntityInputsErrors<TBuilder> | undefined;
  events: Array<InputsValidationStoreEvent<TBuilder>>;
}> {
  let newEntitiesInputsErrors = new Map(dependencies.data.entitiesInputsErrors);

  const entity = ensureEntityExists(
    entityId,
    dependencies.schemaStore.getData().entities,
  );

  const entityDefinition = ensureEntityIsRegistered(
    entity.type,
    dependencies.builder,
  );

  const events: Array<InputsValidationStoreEvent<TBuilder>> = [];

  for (const input of entityDefinition.inputs) {
    newEntitiesInputsErrors = await validateEntityInput(entityId, input.name, {
      ...dependencies,
      entitiesInputsErrors: newEntitiesInputsErrors,
    });

    events.push({
      name: inputsValidationStoreEventsNames.EntityInputErrorUpdated,
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

export function deserializeInputsValidationStoreData<TBuilder extends Builder>(
  data: SerializedInputsValidationStoreData<TBuilder>,
): InputsValidationStoreData<TBuilder> {
  return {
    entitiesInputsErrors: new Map(Object.entries(data.entitiesInputsErrors)),
  };
}

export function serializeInputsValidationStoreData<TBuilder extends Builder>(
  data: InputsValidationStoreData<TBuilder>,
): SerializedInputsValidationStoreData<TBuilder> {
  return {
    entitiesInputsErrors: Object.fromEntries(data.entitiesInputsErrors),
  };
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

function createEntityInputErrorUpdatedEvent<TBuilder extends Builder>(options: {
  entityId: string;
  inputName: string;
  error: unknown;
}): Extract<
  InputsValidationStoreEvent<TBuilder>,
  { name: typeof inputsValidationStoreEventsNames.EntityInputErrorUpdated }
> {
  return {
    name: inputsValidationStoreEventsNames.EntityInputErrorUpdated,
    payload: {
      entityId: options.entityId,
      inputName: options.inputName as KeyofUnion<
        SchemaEntity<TBuilder>["inputs"]
      >,
      error: options.error,
    },
  };
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
    InputsValidationStoreEvent<TBuilder>
  >(
    deserializeInputsValidationStoreData({
      entitiesInputsErrors: validatedErrors,
    }),
  );

  return {
    subscribe,
    getData,
    setData(data) {
      const validatedErrors = ensureEntitiesInputsErrorsAreValid(
        serializeInputsValidationStoreData(data).entitiesInputsErrors,
        options,
      );

      setData(
        deserializeInputsValidationStoreData({
          entitiesInputsErrors: validatedErrors,
        }),
        [
          {
            name: inputsValidationStoreEventsNames.DataSet,
            payload: {
              data,
            },
          },
        ],
      );
    },
    setRawData(data) {
      const validatedErrors = ensureEntitiesInputsErrorsAreValid(
        data.entitiesInputsErrors,
        options,
      );

      const newData = deserializeInputsValidationStoreData({
        entitiesInputsErrors: validatedErrors,
      });

      setData(newData, [
        {
          name: inputsValidationStoreEventsNames.DataSet,
          payload: {
            data: newData,
          },
        },
      ]);
    },
    getSerializedData() {
      return serializeInputsValidationStoreData(getData());
    },
    async validateEntityInput(entityId, inputName) {
      const data = getData();

      const newEntitiesInputsErrors = await validateEntityInput(
        entityId,
        inputName,
        {
          ...options,
          entitiesInputsErrors: new Map(data.entitiesInputsErrors),
        },
      );

      setData(
        {
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
          entitiesInputsErrors: newErrors,
        },
        events,
      );
    },
    async validateEntitiesInputs() {
      const data = getData();

      const newErrors = new Map(data.entitiesInputsErrors);

      let events: Array<InputsValidationStoreEvent<TBuilder>> = [];

      for (const entityId of Array.from(
        options.schemaStore.getData().entities.keys(),
      )) {
        const { entityInputsErrors, events: nextEvents } =
          await validateEntityInputs(entityId, {
            schemaStore: options.schemaStore,
            builder: options.builder,
            data,
          });

        newErrors.set(entityId, entityInputsErrors ?? {});

        events = events.concat(nextEvents);
      }

      setData(
        {
          entitiesInputsErrors: newErrors,
        },
        events,
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

      ensureEntityExists(entityId, options.schemaStore.getData().entities);

      const events: Array<InputsValidationStoreEvent<TBuilder>> = [];

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
          entitiesInputsErrors: newErrors,
        },
        events,
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

      const events: Array<InputsValidationStoreEvent<TBuilder>> = [];

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
          entitiesInputsErrors: newErrors,
        },
        events,
      );
    },
    resetEntitiesInputsErrors() {
      const data = getData();

      const events: Array<InputsValidationStoreEvent<TBuilder>> = [];

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
          entitiesInputsErrors: new Map(),
        },
        events,
      );
    },
  };
}
