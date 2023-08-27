import { SchemaValidationError, schemaValidationErrorCodes } from "./errors";
import {
  type BaseBuilder,
  type ComputedStoreEntity,
  type Schema,
  type StoreEntity,
} from "./store";

function ensureEntityIsRegistered<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
  builder: TBuilder,
): TBuilder["entities"][number] {
  const entityDefinition = builder.entities.find(
    (builderEntity) => builderEntity.name === entity.type,
  );

  if (!entityDefinition) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnknownEntityType,
      entityId: entity.id,
      entityType: entity.type,
    });
  }

  return entityDefinition;
}

function ensureEntityInputIsRegistered<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
  inputName: string,
  builder: TBuilder,
) {
  const entityDefinition = ensureEntityIsRegistered(entity, builder);

  if (!entityDefinition.inputs.some((input) => input.name === inputName)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnknownEntityInputType,
      entityId: entity.id,
      inputName: inputName,
    });
  }
}

function validateEntitySchema<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
  {
    builder,
    schema,
  }: {
    builder: TBuilder;
    schema: Schema<TBuilder>;
  },
): StoreEntity<TBuilder> {
  builder.entityId.validate(entity.id);

  if (typeof entity.type !== "string" || entity.type.length === 0) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityType,
      entityId: entity.id,
    });
  }

  ensureEntityIsRegistered(entity, builder);

  if (
    typeof entity.parentId !== "undefined" &&
    (typeof entity.parentId !== "string" || entity.parentId.length === 0)
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidParentId,
      entityId: entity.id,
      entityParentId: entity.parentId,
    });
  }

  if (entity.parentId && !schema.entities[entity.parentId]) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityParent,
      entityId: entity.id,
      entityParentId: entity.parentId,
    });
  }

  if (entity.parentId && entity.parentId === entity.id) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.CircularEntityReference,
      entityId: entity.id,
    });
  }

  if (!entity.inputs) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityInputs,
      entityId: entity.id,
    });
  }

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

  Object.keys(entity.inputs).forEach((inputName) =>
    ensureEntityInputIsRegistered(entity, inputName, builder),
  );

  return {
    type: entity.type,
    inputs: entity.inputs,
    parentId: entity.parentId,
  };
}

function ensureEntityIdExists(
  entityId: string,
  entities: Schema<BaseBuilder>["entities"],
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
  root: Schema<BaseBuilder>["root"],
): void {
  if (root.filter((id) => id === entityId).length > 1) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.DuplicateRootId,
      entityId,
    });
  }
}

export function validateSchema<TBuilder extends BaseBuilder>(
  schema: Schema<TBuilder>,
  builder: TBuilder,
): Schema<TBuilder> {
  if (
    typeof schema.entities !== "object" ||
    Array.isArray(schema.entities) ||
    schema.entities === null
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntitiesFormat,
      entities: schema.entities,
    });
  }

  if (
    !Array.isArray(schema.root) ||
    schema.root.some((id) => typeof id !== "string")
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidRootFormat,
      root: schema.root,
    });
  }

  if (schema.root.length === 0) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.EmptyRoot,
    });
  }

  const entities = Object.entries(schema.entities).reduce(
    (result, [key, entity]) => ({
      ...result,
      [key]: validateEntitySchema({ ...entity, id: key }, { builder, schema }),
    }),
    schema.entities,
  );

  schema.root.forEach((entityId) => {
    ensureEntityIdExists(entityId, schema.entities);

    ensureRootEntityIdUnique(entityId, schema.root);
  });

  return {
    entities,
    root: schema.root,
  };
}
