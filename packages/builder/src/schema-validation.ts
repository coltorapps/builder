import { SchemaValidationError, schemaValidationErrorCodes } from "./errors";
import {
  type BaseBuilder,
  type ComputedStoreEntity,
  type Schema,
  type StoreEntity,
} from "./store";

function getEntityDefinition(
  entity: ComputedStoreEntity,
  builder: BaseBuilder,
): BaseBuilder["entities"][number] | undefined {
  return builder.entities.find(
    (builderEntity) => builderEntity.name === entity.type,
  );
}

function ensureEntityIsRegistered(
  entity: ComputedStoreEntity,
  builder: BaseBuilder,
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

function ensureEntityTypeHasValidFormat(entity: ComputedStoreEntity): void {
  if (typeof entity.type !== "string" || entity.type.length === 0) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityType,
      entityId: entity.id,
    });
  }
}

function ensureEntityInputsHaveValidFormat(entity: ComputedStoreEntity): void {
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

function ensureEntityHasInputs(entity: ComputedStoreEntity): void {
  if (!entity.inputs) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityInputs,
      entityId: entity.id,
    });
  }
}

function ensureEntityInputIsRegistered(
  entity: ComputedStoreEntity,
  inputName: string,
  builder: BaseBuilder,
): void {
  const entityDefinition = getEntityDefinition(entity, builder);

  if (!entityDefinition?.inputs.some((input) => input.name === inputName)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnknownEntityInputType,
      entityId: entity.id,
      inputName: inputName,
    });
  }
}

function ensureEntityInputsAreRegistered(
  entity: ComputedStoreEntity,
  builder: BaseBuilder,
): void {
  Object.keys(entity.inputs).forEach((inputName) =>
    ensureEntityInputIsRegistered(entity, inputName, builder),
  );
}

function ensureEntityParentIdHasValidReference(
  entity: ComputedStoreEntity,
  entities: Schema["entities"],
): void {
  if (entity.parentId && !entities[entity.parentId]) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityParent,
      entityId: entity.id,
      entityParentId: entity.parentId,
    });
  }
}

function ensureEntityParentIdDoesntHaveSelfReference(
  entity: ComputedStoreEntity,
): void {
  if (entity.parentId && entity.parentId === entity.id) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.SelfEntityReference,
      entityId: entity.id,
    });
  }
}

function ensureEntityChildrenHaveValidFormat(
  entity: ComputedStoreEntity,
): void {
  if (
    typeof entity.children !== "undefined" &&
    !Array.isArray(entity.children)
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidChildrenFormat,
      entityId: entity.id,
    });
  }
}

function ensureChildAllowed(
  childType: string,
  allowedChildren: true | readonly string[],
  { entityId, childId }: { entityId: string; childId: string },
): void {
  if (allowedChildren !== true && !allowedChildren.includes(childType)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ChildNotAllowed,
      entityId,
      childId,
    });
  }
}

function ensureEntityChildrenAreAllowed(
  entity: ComputedStoreEntity,
  {
    builder,
    entities,
  }: {
    builder: BaseBuilder;
    entities: Schema["entities"];
  },
): void {
  const allowedChildren = builder.childrenAllowed[entity.type];

  if (!entity.children) {
    return;
  }

  if (!allowedChildren) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ChildrenNotAllowed,
      entityId: entity.id,
    });
  }

  entity.children.forEach((id) => {
    builder.entityId.validate(id);

    const childEntity = ensureEntityExists(id, entities);

    ensureChildAllowed(childEntity.type, allowedChildren, {
      childId: id,
      entityId: entity.id,
    });
  });
}

function ensureEntityHasParentId(
  entity: ComputedStoreEntity,
  parentId: string,
): void {
  if (entity.parentId !== parentId) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.EntityChildrenMismatch,
      entityId: parentId,
      childId: entity.id,
    });
  }
}

function ensureEntityChildrenMatchParentIds(
  entity: ComputedStoreEntity,
  entities: Schema["entities"],
): void {
  if (!entity.children) {
    return;
  }

  entity.children.forEach((id) =>
    ensureEntityHasParentId(ensureEntityExists(id, entities), entity.id),
  );
}

function ensureEntityParentIdMatchesParentChildren(
  entity: ComputedStoreEntity,
  entities: Schema["entities"],
) {
  if (!entity.parentId) {
    return;
  }

  const parent = ensureEntityExists(entity.parentId, entities);

  if (!parent.children?.includes(entity.id)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.EntityParentMismatch,
      entityId: entity.id,
      parentId: entity.parentId,
    });
  }
}

function ensureEntityCanLackParent(
  entity: ComputedStoreEntity,
  builder: BaseBuilder,
): void {
  if (!entity.parentId && builder.parentRequired.includes(entity.type)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ParentRequired,
      entityId: entity.id,
    });
  }
}

function validateEntitySchema<TBuilder extends BaseBuilder>(
  entity: ComputedStoreEntity<TBuilder>,
  {
    builder,
    entities,
  }: {
    builder: TBuilder;
    entities: Schema<TBuilder>["entities"];
  },
): StoreEntity<TBuilder> {
  builder.entityId.validate(entity.id);

  if (typeof entity.parentId !== "undefined") {
    builder.entityId.validate(entity.parentId);
  }

  ensureEntityTypeHasValidFormat(entity);

  ensureEntityIsRegistered(entity, builder);

  ensureEntityHasInputs(entity);

  ensureEntityInputsHaveValidFormat(entity);

  ensureEntityInputsAreRegistered(entity, builder);

  ensureEntityParentIdHasValidReference(entity, entities);

  ensureEntityParentIdDoesntHaveSelfReference(entity);

  ensureEntityChildrenHaveValidFormat(entity);

  ensureEntityChildrenAreAllowed(entity, { builder, entities });

  ensureEntityChildrenMatchParentIds(entity, entities);

  ensureEntityParentIdMatchesParentChildren(entity, entities);

  ensureEntityCanLackParent(entity, builder);

  return {
    type: entity.type,
    inputs: entity.inputs,
    ...(entity.parentId ? { parentId: entity.parentId } : {}),
    ...(entity.children ? { children: entity.children } : {}),
  };
}

function ensureEntityExists(
  entityId: string,
  entities: Schema["entities"],
): ComputedStoreEntity {
  const entity = entities[entityId];

  if (!entity) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityId,
      entityId,
    });
  }

  return { ...entity, id: entityId };
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
  if (!Array.isArray(root)) {
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

function validateEntitiesSchema<TBuilder extends BaseBuilder>(
  entities: Schema<TBuilder>["entities"],
  builder: TBuilder,
): Schema<TBuilder>["entities"] {
  return Object.entries(entities).reduce(
    (result, [key, entity]) => ({
      ...result,
      [key]: validateEntitySchema(
        { ...entity, id: key },
        { builder, entities },
      ),
    }),
    entities,
  );
}

function ensureRootIdsAreValid(schema: Schema, builder: BaseBuilder): void {
  schema.root.forEach((entityId) => {
    builder.entityId.validate(entityId);

    ensureEntityExists(entityId, schema.entities);

    ensureRootEntityIdUnique(entityId, schema.root);
  });
}

function ensureRootEntityDoesntHaveParent(
  id: string,
  entities: Schema["entities"],
): void {
  const entity = ensureEntityExists(id, entities);

  if (typeof entity.parentId !== "undefined") {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.RootEntityWithParent,
      entityId: id,
    });
  }
}

function ensureRootEntitiesDontHaveParents(schema: Schema): void {
  schema.root.forEach((id) =>
    ensureRootEntityDoesntHaveParent(id, schema.entities),
  );
}

export function validateSchema<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  schema?: Schema<TBuilder>,
): Schema<TBuilder> {
  if (typeof schema === "undefined") {
    return { entities: {}, root: [] };
  }

  ensureEntitiesHaveValidFormat(schema.entities);

  ensureRootHasValidFormat(schema.root);

  ensureRootNotEmptyWhenThereAreEntities(schema);

  const validatedEntities = validateEntitiesSchema(schema.entities, builder);

  const computedSchema = {
    entities: validatedEntities,
    root: schema.root,
  };

  ensureRootIdsAreValid(computedSchema, builder);

  ensureRootEntitiesDontHaveParents(computedSchema);

  return computedSchema;
}
