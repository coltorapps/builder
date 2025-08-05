import { ensureEntityIsRegistered, type Builder } from "./builder";
import { createDataManager } from "./data-manager";
import {
  getEligibleEntitiesIdsForValidation,
  validateEntityValue,
  type EntitiesErrors,
  type EntitiesValues,
  type EntitiesValuesUnion,
  type EntitiesValuesValidationResult,
  type EntityValue,
  type EntityValueValidationResult,
  type OptionalEntitiesValues,
} from "./entities-values";
import {
  computeContextEntities,
  computeContextEntity,
  ensureEntityTypeMatches,
} from "./entity";
import {
  ensureEntityExists,
  SchemaError,
  parseSchema,
  type ParsedSchema,
  type ParsedSchemaEntityWithId,
} from "./schema";
import { type Subscribe } from "./subscription-manager";
import { type ExtractStringKeys } from "./utils";

interface InternalInterpreterStoreData<TBuilder extends Builder = Builder> {
  entitiesValues: Map<
    string,
    EntityValue<TBuilder["entities"][string]> | undefined
  >;
  entitiesErrors: Map<string, unknown>;
  unprocessableEntitiesIds: Set<string>;
}

export interface InterpreterStoreData<TBuilder extends Builder = Builder> {
  entitiesValues: OptionalEntitiesValues<TBuilder["entities"]>;
  entitiesErrors: EntitiesErrors;
  unprocessableEntitiesIds: Array<string>;
}

export type EntityTypeWithAllowedValue<TBuilder extends Builder> = {
  [K in ExtractStringKeys<
    TBuilder["entities"]
  >]: TBuilder["entities"][K]["valueAllowed"] extends true ? K : never;
}[ExtractStringKeys<TBuilder["entities"]>];

function ensureEntitiesErrorsAreValid<TBuilder extends Builder>(
  entitiesErrors: InterpreterStoreData<TBuilder>["entitiesErrors"],
  schema: ParsedSchema<TBuilder>,
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
      throw new Error(`Entity with ID "${entityId}" could not be found.`);
    }
  }

  return entitiesErrors;
}

function ensureEntitiesValuesAreValid<TBuilder extends Builder>(
  entitiesValues: InterpreterStoreData<TBuilder>["entitiesValues"],
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
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
      throw new Error(`Entity with ID "${entityId}" could not be found.`);
    }

    ensureEntityValueAllowed(entityId, builder, schema);
  }

  return entitiesValues;
}

function deserializeInterpreterStoreData<TBuilder extends Builder>(
  data: InterpreterStoreData<TBuilder>,
): InternalInterpreterStoreData<TBuilder> {
  return {
    entitiesValues: new Map(Object.entries(data.entitiesValues)),
    entitiesErrors: new Map(Object.entries(data.entitiesErrors)),
    unprocessableEntitiesIds: new Set(),
  };
}

function serializeInternalEntitiesValues<TBuilder extends Builder>(
  entitiesValues: InternalInterpreterStoreData<TBuilder>["entitiesValues"],
): InterpreterStoreData<TBuilder>["entitiesValues"] {
  return Object.fromEntries(
    entitiesValues,
  ) as InterpreterStoreData<TBuilder>["entitiesValues"];
}

function serializeInternalEntitiesErrors<TBuilder extends Builder>(
  entitiesErrors: InternalInterpreterStoreData<TBuilder>["entitiesErrors"],
): InterpreterStoreData<TBuilder>["entitiesErrors"] {
  return Object.fromEntries(entitiesErrors);
}

function serializeInternalUnprocessableEntitiesIds<TBuilder extends Builder>(
  unprocessableEntitiesIds: InternalInterpreterStoreData<TBuilder>["unprocessableEntitiesIds"],
): InterpreterStoreData<TBuilder>["unprocessableEntitiesIds"] {
  return Array.from(unprocessableEntitiesIds);
}

function serializeInternalInterpreterStoreData<TBuilder extends Builder>(
  data: InternalInterpreterStoreData<TBuilder>,
): InterpreterStoreData<TBuilder> {
  return {
    entitiesValues: serializeInternalEntitiesValues(data.entitiesValues),
    entitiesErrors: serializeInternalEntitiesErrors(data.entitiesErrors),
    unprocessableEntitiesIds: serializeInternalUnprocessableEntitiesIds(
      data.unprocessableEntitiesIds,
    ),
  };
}

export function deserializeAndValidateInterpreterStoreData<
  TBuilder extends Builder,
>(
  data: Omit<InterpreterStoreData<TBuilder>, "unprocessableEntitiesIds">,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): InternalInterpreterStoreData<TBuilder> {
  const validatedEntitiesValues = ensureEntitiesValuesAreValid(
    data.entitiesValues,
    schema,
    builder,
  );

  const validatedEntitiesErrors = ensureEntitiesErrorsAreValid(
    data.entitiesErrors,
    schema,
  );

  return deserializeInterpreterStoreData<TBuilder>({
    entitiesValues: validatedEntitiesValues,
    entitiesErrors: validatedEntitiesErrors,
    unprocessableEntitiesIds: [],
  });
}

function resetEntityValue<TBuilder extends Builder>(
  entityId: string,
  entitiesValues: InternalInterpreterStoreData<TBuilder>["entitiesValues"],
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): InternalInterpreterStoreData<TBuilder>["entitiesValues"] {
  const newEntitiesValues = new Map(entitiesValues);

  const entity = ensureEntityExists(entityId, schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const computeEntityExtensionDefaultValue = builder.entitiesExtensions[
    entity.type
  ]?.defaultValue?.bind?.(builder.entitiesExtensions[entity.type]);

  const context = {
    entity: computeContextEntity(entity, entitiesValues, builder),
    entities: computeContextEntities(
      serializeInternalEntitiesValues(entitiesValues),
      builder,
      schema,
    ),
    schema,
  };

  const newValue = computeEntityExtensionDefaultValue
    ? (computeEntityExtensionDefaultValue({
        ...context,
        defaultValue() {
          return entityDefinition.defaultValue(context);
        },
      }) as EntityValue<TBuilder["entities"][string]> | undefined)
    : entityDefinition.defaultValue(context);

  newEntitiesValues.set(entityId, newValue);

  return newEntitiesValues;
}

function resetEntitiesValues<TBuilder extends Builder>(
  entitiesValues: InternalInterpreterStoreData<TBuilder>["entitiesValues"],
  schema: ParsedSchema<TBuilder>,
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
  schema: ParsedSchema<Builder>,
): boolean {
  const entity = ensureEntityExists(entityId, schema.entities);

  return ensureEntityIsRegistered(entity.type, builder).valueAllowed;
}

function ensureEntityValueAllowed(
  entityId: string,
  builder: Builder,
  schema: ParsedSchema<Builder>,
): void {
  if (!isEntityValueAllowed(entityId, builder, schema)) {
    const entity = ensureEntityExists(entityId, schema.entities);

    throw new Error(
      `Entities of type "${entity.type}" are not allowed to have values.`,
    );
  }
}

function ensureEntityErrorAllowed(
  entityId: string,
  builder: Builder,
  schema: ParsedSchema<Builder>,
): void {
  if (!isEntityValueAllowed(entityId, builder, schema)) {
    const entity = ensureEntityExists(entityId, schema.entities);

    throw new Error(
      `Entities of type "${entity.type}" are not allowed to have errors.`,
    );
  }
}

function ensureEntitiesValuesAllowed(
  entitiesValues: InternalInterpreterStoreData["entitiesValues"],
  builder: Builder,
  schema: ParsedSchema<Builder>,
): void {
  for (const entityId of entitiesValues.keys()) {
    ensureEntityValueAllowed(entityId, builder, schema);
  }
}

function ensureEntitiesErrorsAllowed(
  entitiesErrors: InternalInterpreterStoreData["entitiesErrors"],
  builder: Builder,
  schema: ParsedSchema<Builder>,
): void {
  for (const entityId of entitiesErrors.keys()) {
    ensureEntityErrorAllowed(entityId, builder, schema);
  }
}

function getRecurringChildrenIds(
  entityId: string,
  schema: ParsedSchema,
): Array<string> {
  const entity = ensureEntityExists(entityId, schema.entities);

  let result: Array<string> = [];

  if (entity.children) {
    for (const childId of entity.children) {
      result.push(childId);

      result = result.concat(getRecurringChildrenIds(childId, schema));
    }
  }

  return result;
}

function computeEntityProcessability<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId<
    TBuilder["entities"][string],
    ExtractStringKeys<TBuilder["entities"]>
  >,
  schema: ParsedSchema<TBuilder>,
  data: InternalInterpreterStoreData<TBuilder>,
  builder: TBuilder,
): InternalInterpreterStoreData<TBuilder> {
  let newUnprocessableEntitiesIds = new Set(data.unprocessableEntitiesIds);

  let newEntitiesValues = new Map(data.entitiesValues);

  let newEntitiesErrors = new Map(data.entitiesErrors);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const computeEntityExtensionShouldBeProcessed = builder.entitiesExtensions[
    entity.type
  ]?.shouldBeProcessed?.bind?.(builder.entitiesExtensions[entity.type]);

  const context = {
    entity: computeContextEntity(entity, data.entitiesValues, builder),
    schema,
    entities: computeContextEntities(
      serializeInternalEntitiesValues(data.entitiesValues),
      builder,
      schema,
    ),
  };

  const shouldBeProcessed = computeEntityExtensionShouldBeProcessed
    ? computeEntityExtensionShouldBeProcessed({
        ...context,
        shouldBeProcessed() {
          return entityDefinition.shouldBeProcessed(context);
        },
      })
    : entityDefinition.shouldBeProcessed(context);

  if (!shouldBeProcessed) {
    if (newUnprocessableEntitiesIds.has(entity.id)) {
      return data;
    }

    newEntitiesValues.delete(entity.id);

    newEntitiesErrors.delete(entity.id);

    newUnprocessableEntitiesIds.add(entity.id);

    const recurringChildrenIds = getRecurringChildrenIds(entity.id, schema);

    recurringChildrenIds.forEach((childId) => {
      newUnprocessableEntitiesIds.add(childId);

      newEntitiesValues.delete(childId);

      newEntitiesErrors.delete(childId);
    });

    return {
      ...data,
      entitiesValues: newEntitiesValues,
      unprocessableEntitiesIds: newUnprocessableEntitiesIds,
      entitiesErrors: newEntitiesErrors,
    };
  }

  if (newUnprocessableEntitiesIds.has(entity.id)) {
    newUnprocessableEntitiesIds.delete(entity.id);
  }

  if (entity.children) {
    for (const childId of entity.children) {
      const childEntity = ensureEntityExists(childId, schema.entities);

      const childEntityProcessability = computeEntityProcessability(
        childEntity,
        schema,
        {
          ...data,
          entitiesValues: newEntitiesValues,
          unprocessableEntitiesIds: newUnprocessableEntitiesIds,
          entitiesErrors: newEntitiesErrors,
        },
        builder,
      );

      newUnprocessableEntitiesIds =
        childEntityProcessability.unprocessableEntitiesIds;

      newEntitiesValues = childEntityProcessability.entitiesValues;

      newEntitiesErrors = childEntityProcessability.entitiesErrors;
    }
  }

  return {
    ...data,
    entitiesValues: newEntitiesValues,
    unprocessableEntitiesIds: newUnprocessableEntitiesIds,
    entitiesErrors: newEntitiesErrors,
  };
}

export function computeUnprocessableEntities<TBuilder extends Builder>(
  schema: ParsedSchema<TBuilder>,
  data: InternalInterpreterStoreData<TBuilder>,
  builder: TBuilder,
): InternalInterpreterStoreData<TBuilder> {
  let newUnprocessableEntitiesIds = new Set(data.unprocessableEntitiesIds);

  let newEntitiesValues = new Map(data.entitiesValues);

  let newEntitiesErrors = new Map(data.entitiesErrors);

  for (const entityId of schema.root) {
    const entity = ensureEntityExists(entityId, schema.entities);

    const entityProcessability = computeEntityProcessability(
      entity,
      schema,
      {
        ...data,
        entitiesValues: newEntitiesValues,
        unprocessableEntitiesIds: newUnprocessableEntitiesIds,
        entitiesErrors: newEntitiesErrors,
      },
      builder,
    );

    newUnprocessableEntitiesIds = entityProcessability.unprocessableEntitiesIds;

    newEntitiesValues = entityProcessability.entitiesValues;

    newEntitiesErrors = entityProcessability.entitiesErrors;
  }

  return {
    ...data,
    entitiesValues: newEntitiesValues,
    entitiesErrors: newEntitiesErrors,
    unprocessableEntitiesIds: newUnprocessableEntitiesIds,
  };
}

function isEntityProcessable(
  entityId: string,
  data: InternalInterpreterStoreData,
) {
  return !data.unprocessableEntitiesIds.has(entityId);
}

function ensureEntityProcessable(
  entityId: string,
  data: InternalInterpreterStoreData,
) {
  if (!isEntityProcessable(entityId, data)) {
    throw new Error(`Entity with ID "${entityId}" is not processable.`);
  }
}

export interface InterpreterStoreOptions<TBuilder extends Builder> {
  initialData?: Partial<
    Omit<InterpreterStoreData<TBuilder>, "unprocessableEntitiesIds">
  >;
  initialEntitiesValuesWithDefaults?: boolean;
}

export function createInterpreterStore<TBuilder extends Builder>(
  builder: TBuilder,
  schema: ParsedSchema<TBuilder>,
  options?: InterpreterStoreOptions<TBuilder>,
): InterpreterStore<TBuilder> {
  const schemaValidationResult = parseSchema(schema, builder);

  if (!schemaValidationResult.success) {
    throw new SchemaError(schemaValidationResult.reason);
  }

  let initialStoreData = deserializeAndValidateInterpreterStoreData(
    {
      entitiesValues: options?.initialData?.entitiesValues ?? {},
      entitiesErrors: options?.initialData?.entitiesErrors ?? {},
    },
    schemaValidationResult.data,
    builder,
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

  initialStoreData = computeUnprocessableEntities(
    schema,
    initialStoreData,
    builder,
  );

  const { getData, setData, subscribe } =
    createDataManager<InternalInterpreterStoreData<TBuilder>>(initialStoreData);

  return {
    builder: builder,
    schema: schema,
    subscribe(listener) {
      return subscribe((data, prevData) =>
        listener(
          serializeInternalInterpreterStoreData(data),
          serializeInternalInterpreterStoreData(prevData),
        ),
      );
    },
    getData() {
      return serializeInternalInterpreterStoreData(getData());
    },
    setData(data) {
      let newData = deserializeAndValidateInterpreterStoreData(
        data,
        schemaValidationResult.data,
        builder,
      );

      ensureEntitiesValuesAllowed(newData.entitiesValues, builder, schema);

      ensureEntitiesErrorsAllowed(newData.entitiesErrors, builder, schema);

      newData.unprocessableEntitiesIds = getData().unprocessableEntitiesIds;

      newData = computeUnprocessableEntities(schema, newData, builder);

      setData(newData);
    },
    setEntityValue(entityId: string, value?: unknown, entityType?: undefined) {
      const entity = ensureEntityExists(entityId, schema.entities);

      if (entityType) {
        ensureEntityTypeMatches(entity, entityType);
      }

      ensureEntityValueAllowed(entityId, builder, schema);

      const data = getData();

      ensureEntityProcessable(entityId, data);

      const newEntitiesValues = new Map(data.entitiesValues);

      newEntitiesValues.set(
        entityId,
        value as EntityValue<TBuilder["entities"][string]>,
      );

      let newData = {
        ...data,
        entitiesValues: newEntitiesValues,
      };

      newData = computeUnprocessableEntities(schema, newData, builder);

      setData(newData);
    },
    resetEntityValue(entityId) {
      ensureEntityValueAllowed(entityId, builder, schema);

      const data = getData();

      ensureEntityProcessable(entityId, data);

      const newEntitiesValues = resetEntityValue(
        entityId,
        data.entitiesValues,
        schema,
        builder,
      );

      let newData = {
        ...data,
        entitiesValues: newEntitiesValues,
      };

      newData = computeUnprocessableEntities(schema, newData, builder);

      setData(newData);
    },
    resetEntitiesValues() {
      const data = getData();

      const newEntitiesValues = resetEntitiesValues(
        data.entitiesValues,
        schema,
        builder,
      );

      let newData = {
        ...data,
        entitiesValues: newEntitiesValues,
      };

      newData = computeUnprocessableEntities(schema, newData, builder);

      setData(newData);
    },
    clearEntityValue(entityId) {
      ensureEntityValueAllowed(entityId, builder, schema);

      const data = getData();

      ensureEntityProcessable(entityId, data);

      const newEntitiesValues = new Map(data.entitiesValues);

      newEntitiesValues.delete(entityId);

      let newData = {
        ...data,
        entitiesValues: newEntitiesValues,
      };

      newData = computeUnprocessableEntities(schema, newData, builder);

      setData(newData);
    },
    clearEntitiesValues() {
      const data = getData();

      let newData = {
        ...data,
        entitiesValues: new Map(),
      };

      newData = computeUnprocessableEntities(schema, newData, builder);

      setData(newData);
    },
    setEntityError(entityId, error) {
      ensureEntityErrorAllowed(entityId, builder, schema);

      const data = getData();

      const newEntitiesErrors = new Map(data.entitiesErrors);

      newEntitiesErrors.set(entityId, error);

      setData({
        ...data,
        entitiesErrors: newEntitiesErrors,
      });
    },
    resetEntityError(entityId) {
      ensureEntityErrorAllowed(entityId, builder, schema);

      const data = getData();

      const newEntitiesErrors = new Map(data.entitiesErrors);

      newEntitiesErrors.delete(entityId);

      setData({
        ...data,
        entitiesErrors: newEntitiesErrors,
      });
    },
    resetEntitiesErrors() {
      setData({
        ...getData(),
        entitiesErrors: new Map(),
      });
    },
    setEntitiesErrors(newEntitiesErrors) {
      const data = getData();

      const newData = deserializeAndValidateInterpreterStoreData(
        {
          entitiesValues: serializeInternalEntitiesValues(data.entitiesValues),
          entitiesErrors: newEntitiesErrors,
        },
        schemaValidationResult.data,
        builder,
      );

      ensureEntitiesErrorsAllowed(newData.entitiesErrors, builder, schema);

      setData(newData);
    },
    async validateEntityValue(entityId) {
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
        throw new Error(
          `Entity with ID "${entityId}" is not eligible for validation.`,
        );
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

        setData({
          ...data,
          entitiesErrors: newEntitiesErrors,
        });
      } else {
        newEntitiesErrors.delete(entityId);

        setData({
          ...data,
          entitiesErrors: newEntitiesErrors,
        });
      }

      return entityValidationResult as unknown as ReturnType<InterpreterStore<TBuilder>['validateEntityValue']>;
    },
    async validateEntitiesValues() {
      const data = getData();

      const newEntitiesErrors = new Map(data.entitiesErrors);

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
        } else {
          newEntitiesErrors.delete(entityId);
        }
      }

      setData({
        ...data,
        entitiesErrors: newEntitiesErrors,
      });

      if (newEntitiesErrors.size) {
        return {
          success: false,
          entitiesErrors: serializeInternalEntitiesErrors(newEntitiesErrors),
        };
      }

      return {
        success: true,
        data: serializeInternalEntitiesValues(
          data.entitiesValues,
        ) as EntitiesValues,
      };
    },
    getEntitiesErrors() {
      return serializeInternalEntitiesErrors(getData().entitiesErrors);
    },
    getEntitiesValues() {
      return serializeInternalEntitiesValues(getData().entitiesValues);
    },
    getUnprocessableEntitiesIds() {
      return serializeInternalUnprocessableEntitiesIds(
        getData().unprocessableEntitiesIds,
      );
    },
    isEntityProcessable(entityId) {
      return isEntityProcessable(entityId, getData());
    },
    getEntityValue(entityId) {
      return getData().entitiesValues.get(entityId) as EntitiesValuesUnion<
        TBuilder["entities"]
      >;
    },
    getEntityError(entityId) {
      return getData().entitiesErrors.get(entityId);
    },
    setEntitiesValues(entitiesValues) {
      ensureEntitiesValuesAreValid(entitiesValues, schema, builder);

      setData({
        ...getData(),
        entitiesValues: new Map(Object.entries(entitiesValues)),
      });
    },
  };
}

export interface InterpreterStore<TBuilder extends Builder = Builder> {
  getData(): InterpreterStoreData<TBuilder>;
  getEntitiesErrors(): InterpreterStoreData<TBuilder>["entitiesErrors"];
  getEntitiesValues(): InterpreterStoreData<TBuilder>["entitiesValues"];
  getUnprocessableEntitiesIds(): InterpreterStoreData<TBuilder>["unprocessableEntitiesIds"];
  setData(
    data: Omit<InterpreterStoreData<TBuilder>, "unprocessableEntitiesIds">,
  ): void;
  subscribe(
    ...args: Parameters<Subscribe<InterpreterStoreData<TBuilder>>>
  ): ReturnType<Subscribe<InterpreterStoreData<TBuilder>>>;
  builder: TBuilder;
  schema: ParsedSchema<TBuilder>;
  validateEntityValue(entityId: string): Promise<
    {
      [K in ExtractStringKeys<
        TBuilder["entities"]
      >]: EntityValueValidationResult<TBuilder["entities"][K]>;
    }[ExtractStringKeys<TBuilder["entities"]>]
  >;
  validateEntitiesValues(): Promise<
    EntitiesValuesValidationResult<TBuilder["entities"]>
  >;
  setEntityValue<TEntityType extends EntityTypeWithAllowedValue<TBuilder>>(
    entityId: string,
    value: EntityValue<TBuilder["entities"][TEntityType]> | undefined,
    entityType: TEntityType,
  ): void;
  setEntityValue(
    entityId: string,
    value?: unknown,
    entityType?: undefined,
  ): void;
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
  setEntitiesValues(
    entitiesValues: InterpreterStoreData<TBuilder>["entitiesValues"],
  ): void;
  isEntityProcessable(entityId: string): boolean;
  getEntityValue(
    entityId: string,
  ): EntitiesValuesUnion<TBuilder["entities"]> | undefined;
  getEntityError(entityId: string): unknown;
}
