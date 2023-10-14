import { ensureEntityIsRegistered, type Builder } from "./builder";
import { createDataManager } from "./data-manager";
import {
  ensureEntityExists,
  SchemaValidationError,
  validateSchemaIntegrity,
  type Schema,
} from "./schema";
import { type Subscribe, type SubscriptionEvent } from "./subscription-manager";

type EntityValue<TBuilder extends Builder = Builder> =
  | Awaited<ReturnType<TBuilder["entities"][number]["validate"]>>
  | undefined;

type InternalInterpreterStoreData<TBuilder extends Builder = Builder> = {
  entitiesValues: Map<string, EntityValue<TBuilder>>;
  entitiesErrors: Map<string, unknown>;
};

export type InterpreterStoreData<TBuilder extends Builder = Builder> = {
  entitiesValues: Record<string, EntityValue<TBuilder>>;
  entitiesErrors: Record<string, unknown>;
};

export const interpreterStoreEventsNames = {
  EntityValueUpdated: "EntityValueUpdated",
  EntityErrorUpdated: "EntityErrorUpdated",
  DataSet: "DataSet",
} as const;

export type InterpreterStoreEventName =
  (typeof interpreterStoreEventsNames)[keyof typeof interpreterStoreEventsNames];

export type InterpreterStoreEvent<TBuilder extends Builder = Builder> =
  | SubscriptionEvent<
      typeof interpreterStoreEventsNames.EntityValueUpdated,
      {
        entityId: string;
        value: EntityValue<TBuilder>;
      }
    >
  | SubscriptionEvent<
      typeof interpreterStoreEventsNames.EntityErrorUpdated,
      {
        entityId: string;
        error: unknown;
      }
    >
  | SubscriptionEvent<
      typeof interpreterStoreEventsNames.DataSet,
      {
        data: InterpreterStoreData<TBuilder>;
      }
    >;

function ensureEntitiesErrorsAreValid<TBuilder extends Builder>(
  entitiesErrors: InterpreterStoreData<TBuilder>["entitiesErrors"],
  dependencies: {
    schema: Schema<TBuilder>;
  },
): InterpreterStoreData<TBuilder>["entitiesErrors"] {
  if (
    typeof entitiesErrors !== "object" ||
    Array.isArray(entitiesErrors) ||
    entitiesErrors === null
  ) {
    throw new Error("Invalid errors format.");
  }

  for (const entityId of Object.keys(entitiesErrors)) {
    if (!dependencies.schema.entities[entityId]) {
      throw new Error("Entity not found.");
    }
  }

  return entitiesErrors;
}

function ensureEntitiesValuesAreValid<TBuilder extends Builder>(
  entitiesValues: InterpreterStoreData<TBuilder>["entitiesValues"],
  dependencies: {
    schema: Schema<TBuilder>;
  },
): InterpreterStoreData<TBuilder>["entitiesValues"] {
  if (
    typeof entitiesValues !== "object" ||
    Array.isArray(entitiesValues) ||
    entitiesValues === null
  ) {
    throw new Error("Invalid values format.");
  }

  for (const entityId of Object.keys(entitiesValues)) {
    if (!dependencies.schema.entities[entityId]) {
      throw new Error("Entity not found.");
    }
  }

  return entitiesValues;
}

function deserializeInterpreterStoreData<TBuilder extends Builder>(
  data: InterpreterStoreData<TBuilder>,
): InternalInterpreterStoreData<TBuilder> {
  return {
    entitiesValues: new Map(Object.entries(data.entitiesValues)),
    entitiesErrors: new Map(Object.entries(data.entitiesErrors)),
  };
}

function serializeInternalEntitiesValues<TBuilder extends Builder>(
  entitiesValues: InternalInterpreterStoreData<TBuilder>["entitiesValues"],
): InterpreterStoreData<TBuilder>["entitiesValues"] {
  return Object.fromEntries(entitiesValues);
}

function serializeInternalEntitiesErrors<TBuilder extends Builder>(
  entitiesErrors: InternalInterpreterStoreData<TBuilder>["entitiesErrors"],
): InterpreterStoreData<TBuilder>["entitiesErrors"] {
  return Object.fromEntries(entitiesErrors);
}

function serializeInternalInterpreterStoreData<TBuilder extends Builder>(
  data: InternalInterpreterStoreData<TBuilder>,
): InterpreterStoreData<TBuilder> {
  return {
    entitiesValues: serializeInternalEntitiesValues(data.entitiesValues),
    entitiesErrors: serializeInternalEntitiesErrors(data.entitiesErrors),
  };
}

function deserializeAndValidateInterpreterStoreData<TBuilder extends Builder>(
  data: InterpreterStoreData<TBuilder>,
  dependencies: {
    builder: TBuilder;
    schema: Schema<TBuilder>;
  },
): InternalInterpreterStoreData<TBuilder> {
  const validatedEntitiesValues = ensureEntitiesValuesAreValid(
    data.entitiesValues,
    {
      schema: dependencies.schema,
    },
  );

  const validatedEntitiesErrors = ensureEntitiesErrorsAreValid(
    data.entitiesErrors,
    {
      schema: dependencies.schema,
    },
  );

  return deserializeInterpreterStoreData<TBuilder>({
    entitiesValues: validatedEntitiesValues,
    entitiesErrors: validatedEntitiesErrors,
  });
}

function resetEntityValue<TBuilder extends Builder>(
  entityId: string,
  dependencies: {
    entitiesValues: InternalInterpreterStoreData<TBuilder>["entitiesValues"];
    schema: Schema<TBuilder>;
    builder: TBuilder;
  },
): InternalInterpreterStoreData<TBuilder>["entitiesValues"] {
  const newEntitiesValues = new Map(dependencies.entitiesValues);

  const entity = ensureEntityExists(entityId, dependencies.schema.entities);

  const entityDefinition = ensureEntityIsRegistered(
    entity.type,
    dependencies.builder,
  );

  const newValue = entityDefinition.defaultValue({
    inputs: entity.inputs,
    values: serializeInternalEntitiesValues(dependencies.entitiesValues),
  }) as EntityValue<TBuilder>;

  newEntitiesValues.set(entityId, newValue);

  return newEntitiesValues;
}

function resetEntitiesValues<TBuilder extends Builder>(
  entitiesValues: InternalInterpreterStoreData<TBuilder>["entitiesValues"],
  dependencies: {
    schema: Schema<TBuilder>;
    builder: TBuilder;
  },
  options?: {
    skipAlreadySetEntitiesValues: boolean;
  },
): InternalInterpreterStoreData<TBuilder>["entitiesValues"] {
  let newEntitiesValues = new Map(entitiesValues);

  for (const entityId of Object.keys(dependencies.schema.entities)) {
    if (
      !isEntityValueAllowed(entityId, dependencies) ||
      (options?.skipAlreadySetEntitiesValues && entitiesValues.has(entityId))
    ) {
      continue;
    }

    newEntitiesValues = resetEntityValue(entityId, {
      schema: dependencies.schema,
      entitiesValues: newEntitiesValues,
      builder: dependencies.builder,
    });
  }

  return newEntitiesValues;
}

function isEntityValueAllowed(
  entityId: string,
  dependencies: {
    builder: Builder;
    schema: Schema<Builder>;
  },
): boolean {
  const entity = ensureEntityExists(entityId, dependencies.schema.entities);

  return ensureEntityIsRegistered(entity.type, dependencies.builder)
    .isValueAllowed;
}

function ensureEntityValueAllowed(
  entityId: string,
  dependencies: {
    builder: Builder;
    schema: Schema<Builder>;
  },
): void {
  if (!isEntityValueAllowed(entityId, dependencies)) {
    throw new Error("Entity value not allowed.");
  }
}

function ensureEntityErrorAllowed(
  entityId: string,
  dependencies: {
    builder: Builder;
    schema: Schema<Builder>;
  },
): void {
  if (!isEntityValueAllowed(entityId, dependencies)) {
    throw new Error("Entity error not allowed.");
  }
}

function ensureEntitiesValuesAllowed(
  entitiesValues: InternalInterpreterStoreData["entitiesValues"],
  dependencies: {
    builder: Builder;
    schema: Schema<Builder>;
  },
): void {
  for (const entityId of entitiesValues.keys()) {
    ensureEntityValueAllowed(entityId, dependencies);
  }
}

function ensureEntitiesErrorsAllowed(
  entitiesErrors: InternalInterpreterStoreData["entitiesErrors"],
  dependencies: {
    builder: Builder;
    schema: Schema<Builder>;
  },
): void {
  for (const entityId of entitiesErrors.keys()) {
    ensureEntityErrorAllowed(entityId, dependencies);
  }
}

export function createInterpreterStore<TBuilder extends Builder>(options: {
  builder: TBuilder;
  schema: Schema<TBuilder>;
  initialData?: Partial<InterpreterStoreData<TBuilder>>;
  initialEntitiesValuesWithDefaults?: boolean;
}): InterpreterStore<TBuilder> {
  const schemaValidationResult = validateSchemaIntegrity(options.schema, {
    builder: options.builder,
  });

  if (!schemaValidationResult.success) {
    throw new SchemaValidationError(schemaValidationResult.reason);
  }

  const initialStoreData = deserializeAndValidateInterpreterStoreData(
    {
      entitiesValues: options.initialData?.entitiesValues ?? {},
      entitiesErrors: options.initialData?.entitiesErrors ?? {},
    },
    {
      builder: options.builder,
      schema: schemaValidationResult.data,
    },
  );

  ensureEntitiesValuesAllowed(initialStoreData.entitiesValues, options);

  ensureEntitiesErrorsAllowed(initialStoreData.entitiesErrors, options);

  if (options.initialEntitiesValuesWithDefaults !== false) {
    initialStoreData.entitiesValues = resetEntitiesValues(
      initialStoreData.entitiesValues,
      {
        builder: options.builder,
        schema: options.schema,
      },
      {
        skipAlreadySetEntitiesValues: true,
      },
    );
  }

  const { getData, setData, subscribe } = createDataManager<
    InternalInterpreterStoreData<TBuilder>,
    InterpreterStoreEvent<TBuilder>
  >(initialStoreData);

  return {
    builder: options.builder,
    schema: options.schema,
    subscribe(listener) {
      return subscribe((data, events) =>
        listener(serializeInternalInterpreterStoreData(data), events),
      );
    },
    getData() {
      return serializeInternalInterpreterStoreData(getData());
    },
    setData(data) {
      const newData = deserializeAndValidateInterpreterStoreData(data, {
        builder: options.builder,
        schema: schemaValidationResult.data,
      });

      ensureEntitiesValuesAllowed(newData.entitiesValues, options);

      ensureEntitiesErrorsAllowed(newData.entitiesErrors, options);

      setData(newData, [
        {
          name: interpreterStoreEventsNames.DataSet,
          payload: {
            data: serializeInternalInterpreterStoreData(newData),
          },
        },
      ]);
    },
    setEntityValue(entityId, value) {
      ensureEntityValueAllowed(entityId, options);

      const data = getData();

      const newEntitiesValues = new Map(data.entitiesValues);

      newEntitiesValues.set(entityId, value);

      setData(
        {
          ...data,
          entitiesValues: newEntitiesValues,
        },
        [
          {
            name: interpreterStoreEventsNames.EntityValueUpdated,
            payload: {
              entityId,
              value,
            },
          },
        ],
      );
    },
    resetEntityValue(entityId) {
      ensureEntityValueAllowed(entityId, options);

      const data = getData();

      const newEntitiesValues = resetEntityValue(entityId, {
        schema: options.schema,
        entitiesValues: data.entitiesValues,
        builder: options.builder,
      });

      setData(
        {
          ...data,
          entitiesValues: newEntitiesValues,
        },
        [
          {
            name: interpreterStoreEventsNames.EntityValueUpdated,
            payload: {
              entityId,
              value: newEntitiesValues.get(entityId),
            },
          },
        ],
      );
    },
    resetEntitiesValues() {
      const data = getData();

      const newEntitiesValues = resetEntitiesValues(data.entitiesValues, {
        builder: options.builder,
        schema: options.schema,
      });

      const events: Array<InterpreterStoreEvent<TBuilder>> = [];

      for (const entityId of newEntitiesValues.keys()) {
        events.push({
          name: interpreterStoreEventsNames.EntityValueUpdated,
          payload: {
            entityId,
            value: newEntitiesValues.get(entityId),
          },
        });
      }

      setData(
        {
          ...data,
          entitiesValues: newEntitiesValues,
        },
        events,
      );
    },
    clearEntityValue(entityId) {
      ensureEntityValueAllowed(entityId, options);

      const data = getData();

      const newEntitiesValues = new Map(data.entitiesValues);

      newEntitiesValues.delete(entityId);

      setData(
        {
          ...data,
          entitiesValues: newEntitiesValues,
        },
        [
          {
            name: interpreterStoreEventsNames.EntityValueUpdated,
            payload: {
              entityId,
              value: undefined,
            },
          },
        ],
      );
    },
    clearEntitiesValues() {
      const data = getData();

      const events: Array<InterpreterStoreEvent<TBuilder>> = [];

      for (const entityId of data.entitiesValues.keys()) {
        events.push({
          name: interpreterStoreEventsNames.EntityValueUpdated,
          payload: {
            entityId,
            value: undefined,
          },
        });
      }

      setData(
        {
          ...data,
          entitiesValues: new Map(),
        },
        events,
      );
    },
    setEntityError(entityId, error) {
      ensureEntityErrorAllowed(entityId, options);

      const data = getData();

      const newEntitiesErrors = new Map(data.entitiesErrors);

      newEntitiesErrors.set(entityId, error);

      setData(
        {
          ...data,
          entitiesErrors: newEntitiesErrors,
        },
        [
          {
            name: interpreterStoreEventsNames.EntityErrorUpdated,
            payload: {
              entityId,
              error,
            },
          },
        ],
      );
    },
    resetEntityError(entityId) {
      ensureEntityErrorAllowed(entityId, options);

      const data = getData();

      const newEntitiesErrors = new Map(data.entitiesErrors);

      newEntitiesErrors.delete(entityId);

      setData(
        {
          ...data,
          entitiesErrors: newEntitiesErrors,
        },
        [
          {
            name: interpreterStoreEventsNames.EntityErrorUpdated,
            payload: {
              entityId,
              error: undefined,
            },
          },
        ],
      );
    },
    resetEntitiesErrors() {
      const data = getData();

      const events: Array<InterpreterStoreEvent<TBuilder>> = [];

      for (const entityId of data.entitiesErrors.keys()) {
        events.push({
          name: interpreterStoreEventsNames.EntityErrorUpdated,
          payload: {
            entityId,
            error: undefined,
          },
        });
      }

      setData(
        {
          ...data,
          entitiesErrors: new Map(),
        },
        events,
      );
    },
    setEntitiesErrors(entitiesErrors) {
      const newData = deserializeAndValidateInterpreterStoreData(
        {
          entitiesValues: serializeInternalEntitiesValues(
            getData().entitiesValues,
          ),
          entitiesErrors,
        },
        {
          builder: options.builder,
          schema: schemaValidationResult.data,
        },
      );

      ensureEntitiesErrorsAllowed(newData.entitiesErrors, options);

      setData(newData, [
        {
          name: interpreterStoreEventsNames.DataSet,
          payload: {
            data: serializeInternalInterpreterStoreData(newData),
          },
        },
      ]);
    },
  };
}

export type InterpreterStore<TBuilder extends Builder = Builder> = {
  getData(): InterpreterStoreData<TBuilder>;
  setData(data: InterpreterStoreData<TBuilder>): void;
  subscribe(
    ...args: Parameters<
      Subscribe<InterpreterStoreData<TBuilder>, InterpreterStoreEvent<TBuilder>>
    >
  ): ReturnType<
    Subscribe<InterpreterStoreData<TBuilder>, InterpreterStoreEvent<TBuilder>>
  >;
  builder: TBuilder;
  schema: Schema<TBuilder>;
  setEntityValue(entityId: string, value: EntityValue<TBuilder>): void;
  resetEntityValue(entityId: string): void;
  resetEntitiesValues(): void;
  clearEntityValue(entityId: string): void;
  clearEntitiesValues(): void;
  setEntityError(entityId: string, error: unknown): void;
  resetEntityError(entityId: string): void;
  resetEntitiesErrors(): void;
  setEntitiesErrors(
    entitiesErrors: InterpreterStoreData<TBuilder>["entitiesErrors"],
  ): void;
};
