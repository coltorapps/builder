import { SchemaValidationError, schemaValidationErrorCodes } from "./errors";
import {
  type BaseBuilder,
  type ComputedStoreEntity,
  type Schema,
  type StoreEntity,
} from "./store";

function getEntityDefinition<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
  builder: TBuilder,
): TBuilder["entities"][number] | undefined {
  return builder.entities.find(
    (builderEntity) => builderEntity.name === entity.type,
  );
}

function ensureEntityIsRegistered<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
  builder: TBuilder,
): void {
  const entityDefinition = getEntityDefinition(entity, builder);

  if (!entityDefinition) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnknownEntityType,
      entityId: entity.id,
      entityType: entity.type,
    });
  }
}

function ensureEntityTypeHasValidFormat<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
): void {
  if (typeof entity.type !== "string" || entity.type.length === 0) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityType,
      entityId: entity.id,
    });
  }
}

function ensureEntityInputsHaveValidFormat<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
): void {
  if (
    typeof entity.inputs !== "object" ||
    Array.isArray(entity.inputs) ||
    entity.inputs === null
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntityInputsFormat,
      entityId: entity.id,
      entityInputs: entity.inputs,
    });
  }
}

function ensureEntityHasInputs<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
): void {
  if (!entity.inputs) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityInputs,
      entityId: entity.id,
    });
  }
}

function ensureEntityInputIsRegistered<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
  inputName: string,
  builder: TBuilder,
) {
  const entityDefinition = getEntityDefinition(entity, builder);

  if (!entityDefinition?.inputs.some((input) => input.name === inputName)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnknownEntityInputType,
      entityId: entity.id,
      inputName: inputName,
    });
  }
}

function ensureEntityInputsAreRegistered<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
  builder: TBuilder,
) {
  Object.keys(entity.inputs).forEach((inputName) =>
    ensureEntityInputIsRegistered(entity, inputName, builder),
  );
}

function validateEntitySchema<TBuilder extends BaseBuilder>(
  entity: StoreEntity<TBuilder> & { id: string },
  builder: TBuilder,
): StoreEntity<TBuilder> {
  builder.entityId.validate(entity.id);

  ensureEntityTypeHasValidFormat(entity);

  ensureEntityIsRegistered(entity, builder);

  ensureEntityHasInputs(entity);

  ensureEntityInputsHaveValidFormat(entity);

  ensureEntityInputsAreRegistered(entity, builder);

  return {
    type: entity.type,
    inputs: entity.inputs,
  } satisfies Record<keyof StoreEntity, unknown>;
}

function ensureEntityIdExists(
  entityId: string,
  entities: Schema["entities"],
): void {
  const entitiesIds = Object.keys(entities);

  if (!entitiesIds.includes(entityId)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityId,
      entityId,
    });
  }
}

function ensureRootEntityIdUnique(
  entityId: string,
  root: Schema["root"],
): void {
  if (root.filter((id) => id === entityId).length > 1) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.DuplicateRootId,
      entityId,
    });
  }
}

function ensureEntitiesHaveValidFormat(entities: Schema["entities"]): void {
  if (
    typeof entities !== "object" ||
    Array.isArray(entities) ||
    entities === null
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntitiesFormat,
      entities,
    });
  }
}

function ensureRootHasValidFormat(root: Schema["root"]): void {
  if (!Array.isArray(root) || root.some((id) => typeof id !== "string")) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidRootFormat,
      root: root,
    });
  }
}

function ensureRootNotEmptyWhenThereAreEntities(schema: Schema): void {
  if (schema.root.length === 0 && Object.keys(schema.entities).length > 0) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.EmptyRoot,
    });
  }
}

export function validateSchema<TBuilder extends BaseBuilder>(
  schema: Schema<TBuilder>,
  builder: TBuilder,
): Schema<TBuilder> {
  ensureEntitiesHaveValidFormat(schema.entities);

  ensureRootHasValidFormat(schema.root);

  ensureRootNotEmptyWhenThereAreEntities(schema);

  const validatedEntities = Object.entries(schema.entities).reduce(
    (result, [key, entity]) => ({
      ...result,
      [key]: validateEntitySchema({ ...entity, id: key }, builder),
    }),
    schema.entities,
  );

  schema.root.forEach((entityId) => {
    ensureEntityIdExists(entityId, validatedEntities);

    ensureRootEntityIdUnique(entityId, schema.root);
  });

  return {
    entities: validatedEntities,
    root: schema.root,
  };
}
