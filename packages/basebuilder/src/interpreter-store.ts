import { ensureEntityIsRegistered, type Builder } from "./builder";
import { createDataManager } from "./data-manager";
import {
  getEligibleEntitiesIdsForValidation,
  validateEntityValue,
  type EntitiesErrors,
  type EntitiesValues,
  type EntitiesValuesValidationResult,
  type EntityValue,
} from "./entities-values";
import {
  ensureEntityExists,
  SchemaValidationError,
  validateSchemaIntegrity,
  type Schema,
} from "./schema";
import { type Subscribe, type SubscriptionEvent } from "./subscription-manager";

type InternalInterpreterStoreData<TBuilder extends Builder = Builder> = {
  entitiesValues: Map<string, EntityValue<TBuilder>>;
  entitiesErrors: Map<string, unknown>;
};

export type InterpreterStoreData<TBuilder extends Builder = Builder> = {
  entitiesValues: EntitiesValues<TBuilder>;
  entitiesErrors: EntitiesErrors;
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
  schema: Schema<TBuilder>,
): InterpreterStoreData<TBuilder>["entitiesErrors"] {
  if (
    typeof entitiesErrors !== "object" ||
    Array.isArray(entitiesErrors) ||
    entitiesErrors === null
  ) {
    throw new Error("Invalid errors format.");
  }

  for (const entityId of Object.keys(entitiesErrors)) {
    if (!schema.entities[entityId]) {
      throw new Error("Entity not found.");
    }
  }

  return entitiesErrors;
}

function ensureEntitiesValuesAreValid<TBuilder extends Builder>(
  entitiesValues: InterpreterStoreData<TBuilder>["entitiesValues"],
  schema: Schema<TBuilder>,
): InterpreterStoreData<TBuilder>["entitiesValues"] {
  if (
    typeof entitiesValues !== "object" ||
    Array.isArray(entitiesValues) ||
    entitiesValues === null
  ) {
    throw new Error("Invalid values format.");
  }

  for (const entityId of Object.keys(entitiesValues)) {
    if (!schema.entities[entityId]) {
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
  builder: TBuilder,
  schema: Schema<TBuilder>,
): InternalInterpreterStoreData<TBuilder> {
  const validatedEntitiesValues = ensureEntitiesValuesAreValid(
    data.entitiesValues,
    schema,
  );

  const validatedEntitiesErrors = ensureEntitiesErrorsAreValid(
    data.entitiesErrors,
    schema,
  );

  return deserializeInterpreterStoreData<TBuilder>({
    entitiesValues: validatedEntitiesValues,
    entitiesErrors: validatedEntitiesErrors,
  });
}

function resetEntityValue<TBuilder extends Builder>(
  entityId: string,
  entitiesValues: InternalInterpreterStoreData<TBuilder>["entitiesValues"],
  schema: Schema<TBuilder>,
  builder: TBuilder,
): InternalInterpreterStoreData<TBuilder>["entitiesValues"] {
  const newEntitiesValues = new Map(entitiesValues);

  const entity = ensureEntityExists(entityId, schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const newValue = entityDefinition.defaultValue({
    entity,
    entitiesValues: serializeInternalEntitiesValues(entitiesValues),
  }) as EntityValue<TBuilder>;

  newEntitiesValues.set(entityId, newValue);

  return newEntitiesValues;
}

function resetEntitiesValues<TBuilder extends Builder>(
  entitiesValues: InternalInterpreterStoreData<TBuilder>["entitiesValues"],
  schema: Schema<TBuilder>,
  builder: TBuilder,
  options?: {
    skipAlreadySetEntitiesValues?: boolean;
  },
): InternalInterpreterStoreData<TBuilder>["entitiesValues"] {
  let newEntitiesValues = new Map(entitiesValues);

  for (const entityId of Object.keys(schema.entities)) {
    if (
      !isEntityValueAllowed(entityId, builder, schema) ||
      (options?.skipAlreadySetEntitiesValues && entitiesValues.has(entityId))
    ) {
      continue;
    }

    newEntitiesValues = resetEntityValue(
      entityId,
      newEntitiesValues,
      schema,
      builder,
    );
  }

  return newEntitiesValues;
}

function isEntityValueAllowed(
  entityId: string,
  builder: Builder,
  schema: Schema<Builder>,
): boolean {
  const entity = ensureEntityExists(entityId, schema.entities);

  return ensureEntityIsRegistered(entity.type, builder).valueAllowed;
}

function ensureEntityValueAllowed(
  entityId: string,
  builder: Builder,
  schema: Schema<Builder>,
): void {
  if (!isEntityValueAllowed(entityId, builder, schema)) {
    throw new Error("Entity value not allowed.");
  }
}

function ensureEntityErrorAllowed(
  entityId: string,
  builder: Builder,
  schema: Schema<Builder>,
): void {
  if (!isEntityValueAllowed(entityId, builder, schema)) {
    throw new Error("Entity error not allowed.");
  }
}

function ensureEntitiesValuesAllowed(
  entitiesValues: InternalInterpreterStoreData["entitiesValues"],
  builder: Builder,
  schema: Schema<Builder>,
): void {
  for (const entityId of entitiesValues.keys()) {
    ensureEntityValueAllowed(entityId, builder, schema);
  }
}

function ensureEntitiesErrorsAllowed(
  entitiesErrors: InternalInterpreterStoreData["entitiesErrors"],
  builder: Builder,
  schema: Schema<Builder>,
): void {
  for (const entityId of entitiesErrors.keys()) {
    ensureEntityErrorAllowed(entityId, builder, schema);
  }
}

export function createInterpreterStore<TBuilder extends Builder>(
  builder: TBuilder,
  schema: Schema<TBuilder>,
  options?: {
    initialData?: Partial<InterpreterStoreData<TBuilder>>;
    initialEntitiesValuesWithDefaults?: boolean;
  },
): InterpreterStore<TBuilder> {
  const schemaValidationResult = validateSchemaIntegrity(schema, builder);

  if (!schemaValidationResult.success) {
    throw new SchemaValidationError(schemaValidationResult.reason);
  }

  const initialStoreData = deserializeAndValidateInterpreterStoreData(
    {
      entitiesValues: options?.initialData?.entitiesValues ?? {},
      entitiesErrors: options?.initialData?.entitiesErrors ?? {},
    },
    builder,
    schemaValidationResult.data,
  );

  ensureEntitiesValuesAllowed(initialStoreData.entitiesValues, builder, schema);

  ensureEntitiesErrorsAllowed(initialStoreData.entitiesErrors, builder, schema);

  if (options?.initialEntitiesValuesWithDefaults !== false) {
    initialStoreData.entitiesValues = resetEntitiesValues(
      initialStoreData.entitiesValues,
      schema,
      builder,
      { skipAlreadySetEntitiesValues: true },
    );
  }

  const { getData, setData, subscribe } = createDataManager<
    InternalInterpreterStoreData<TBuilder>,
    InterpreterStoreEvent<TBuilder>
  >(initialStoreData);

  return {
    builder: builder,
    schema: schema,
    subscribe(listener) {
      return subscribe((data, events) =>
        listener(serializeInternalInterpreterStoreData(data), events),
      );
    },
    getData() {
      return serializeInternalInterpreterStoreData(getData());
    },
    setData(data) {
      const newData = deserializeAndValidateInterpreterStoreData(
        data,
        builder,
        schemaValidationResult.data,
      );

      ensureEntitiesValuesAllowed(newData.entitiesValues, builder, schema);

      ensureEntitiesErrorsAllowed(newData.entitiesErrors, builder, schema);

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
      ensureEntityValueAllowed(entityId, builder, schema);

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
      ensureEntityValueAllowed(entityId, builder, schema);

      const data = getData();

      const newEntitiesValues = resetEntityValue(
        entityId,
        data.entitiesValues,
        schema,
        builder,
      );

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

      const newEntitiesValues = resetEntitiesValues(
        data.entitiesValues,
        schema,
        builder,
      );

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
      ensureEntityValueAllowed(entityId, builder, schema);

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
      ensureEntityErrorAllowed(entityId, builder, schema);

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
      ensureEntityErrorAllowed(entityId, builder, schema);

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
    setEntitiesErrors(newEntitiesErrors) {
      const data = getData();

      const newData = deserializeAndValidateInterpreterStoreData(
        {
          entitiesValues: serializeInternalEntitiesValues(data.entitiesValues),
          entitiesErrors: newEntitiesErrors,
        },
        builder,
        schemaValidationResult.data,
      );

      ensureEntitiesErrorsAllowed(newData.entitiesErrors, builder, schema);

      const events: Array<InterpreterStoreEvent<TBuilder>> = [];

      for (const [entityId] of data.entitiesErrors) {
        const newEntityError = newData.entitiesErrors.get(entityId);

        if (!newEntityError) {
          events.push({
            name: interpreterStoreEventsNames.EntityErrorUpdated,
            payload: {
              entityId,
              error: undefined,
            },
          });
        }
      }

      for (const [entityId, newEntityError] of newData.entitiesErrors) {
        events.push({
          name: interpreterStoreEventsNames.EntityErrorUpdated,
          payload: {
            entityId,
            error: newEntityError,
          },
        });
      }

      setData(newData, events);
    },
    async validateEntity(entityId) {
      const data = getData();

      const serializedEntitiesValues = serializeInternalEntitiesValues(
        data.entitiesValues,
      );

      const eligibleEntitiesIdsForValidation =
        getEligibleEntitiesIdsForValidation(
          serializedEntitiesValues,
          builder,
          schema,
        );

      if (!eligibleEntitiesIdsForValidation.includes(entityId)) {
        throw new Error("Entity not eligible for validation.");
      }

      const entityValidationResult = await validateEntityValue(
        entityId,
        serializedEntitiesValues,
        builder,
        schema,
      );

      const newEntitiesErrors = new Map(data.entitiesErrors);

      if (!entityValidationResult.success) {
        newEntitiesErrors.set(entityId, entityValidationResult.error);

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
                error: entityValidationResult.error,
              },
            },
          ],
        );
      } else {
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
      }
    },
    async validateEntities() {
      const data = getData();

      const newEntitiesErrors = new Map(data.entitiesErrors);

      const events: Array<InterpreterStoreEvent<TBuilder>> = [];

      const serializedEntitiesValues = serializeInternalEntitiesValues(
        data.entitiesValues,
      );

      const eligibleEntitiesIdsForValidation =
        getEligibleEntitiesIdsForValidation(
          serializedEntitiesValues,
          builder,
          schema,
        );

      for (const entityId of Object.keys(schema.entities)) {
        if (!eligibleEntitiesIdsForValidation.includes(entityId)) {
          newEntitiesErrors.delete(entityId);

          events.push({
            name: interpreterStoreEventsNames.EntityErrorUpdated,
            payload: {
              entityId,
              error: undefined,
            },
          });

          continue;
        }

        const entityValidationResult = await validateEntityValue(
          entityId,
          serializedEntitiesValues,
          builder,
          schema,
        );

        if (!entityValidationResult.success) {
          newEntitiesErrors.set(entityId, entityValidationResult.error);

          events.push({
            name: interpreterStoreEventsNames.EntityErrorUpdated,
            payload: {
              entityId,
              error: entityValidationResult.error,
            },
          });
        } else {
          newEntitiesErrors.delete(entityId);

          events.push({
            name: interpreterStoreEventsNames.EntityErrorUpdated,
            payload: {
              entityId,
              error: undefined,
            },
          });
        }
      }

      setData(
        {
          ...data,
          entitiesErrors: newEntitiesErrors,
        },
        events,
      );

      if (newEntitiesErrors.size) {
        return {
          success: false,
          entitiesErrors: serializeInternalEntitiesErrors(newEntitiesErrors),
        };
      }

      return {
        success: true,
        data: serializeInternalEntitiesValues(data.entitiesValues),
      };
    },
    getEntitiesErrors() {
      return serializeInternalEntitiesErrors(getData().entitiesErrors);
    },
    getEntitiesValues() {
      return serializeInternalEntitiesValues(getData().entitiesValues);
    },
  };
}

export type InterpreterStore<TBuilder extends Builder = Builder> = {
  getData(): InterpreterStoreData<TBuilder>;
  getEntitiesErrors(): InterpreterStoreData<TBuilder>["entitiesErrors"];
  getEntitiesValues(): InterpreterStoreData<TBuilder>["entitiesValues"];
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
  validateEntity(entityId: string): Promise<void>;
  validateEntities(): Promise<EntitiesValuesValidationResult<TBuilder>>;
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
