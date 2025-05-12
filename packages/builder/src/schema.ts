import { type AttributesValues } from "./attribute";
import {
  getEntityDefinition,
  isEntityChildAllowed,
  isEntityParentAllowed,
  isEntityParentRequired,
  type Builder,
} from "./builder";
import { type Entity } from "./entity";

export const schemaValidationErrorCodes = {
  InvalidRootFormat: "InvalidRootFormat",
  DuplicateRootId: "DuplicateRootId",
  DuplicateChildId: "DuplicateChildId",
  RootEntityWithParent: "RootEntityWithParent",
  EmptyRoot: "EmptyRoot",
  NonexistentEntityId: "NonexistentEntityId",
  InvalidEntitiesFormat: "InvalidEntitiesFormat",
  MissingEntityType: "MissingEntityType",
  UnknownEntityType: "UnknownEntityType",
  InvalidChildrenFormat: "InvalidChildrenFormat",
  InvalidSchema: "InvalidSchema",
  NonexistentEntityParent: "NonexistentEntityParent",
  MissingEntityAttributes: "MissingEntityAttributes",
  InvalidEntityAttributesFormat: "InvalidEntityAttributesFormat",
  UnknownEntityAttributeType: "UnknownEntityAttributeType",
  InvalidEntityAttributes: "InvalidEntityAttributes",
  InvalidEntitiesAttributes: "InvalidEntitiesAttributes",
  SelfEntityReference: "SelfEntityReference",
  ChildNotAllowed: "ChildNotAllowed",
  EntityChildrenMismatch: "EntityChildrenMismatch",
  ParentRequired: "ParentRequired",
  ParentNotAllowed: "ParentNotAllowed",
  EntityParentMismatch: "EntityParentMismatch",
  UnreachableEntity: "UnreachableEntity",
} as const;

export type SchemaValidationErrorCode =
  (typeof schemaValidationErrorCodes)[keyof typeof schemaValidationErrorCodes];

const schemaValidationErrorMessages: Record<SchemaValidationErrorCode, string> =
  {
    [schemaValidationErrorCodes.InvalidRootFormat]:
      "The root must be an array of strings.",
    [schemaValidationErrorCodes.DuplicateRootId]:
      "Duplicate IDs detected in the root.",
    [schemaValidationErrorCodes.DuplicateChildId]:
      "Duplicate IDs detected in the children.",
    [schemaValidationErrorCodes.RootEntityWithParent]:
      "Root entities can't have a parent.",
    [schemaValidationErrorCodes.EmptyRoot]:
      "The root must contain at least one entity.",
    [schemaValidationErrorCodes.NonexistentEntityId]:
      "A provided entity ID does not exist.",
    [schemaValidationErrorCodes.InvalidEntitiesFormat]:
      "Entities should be an object containing valid entities.",
    [schemaValidationErrorCodes.MissingEntityType]: "Entity type is missing.",
    [schemaValidationErrorCodes.UnknownEntityType]:
      "The provided entity type is unknown.",
    [schemaValidationErrorCodes.InvalidChildrenFormat]:
      "The provided children are invalid.",
    [schemaValidationErrorCodes.NonexistentEntityParent]:
      "The parent ID references a non-existent entity.",
    [schemaValidationErrorCodes.MissingEntityAttributes]:
      "Entity attributes are missing.",
    [schemaValidationErrorCodes.InvalidEntityAttributesFormat]:
      "The provided entity attributes are invalid.",
    [schemaValidationErrorCodes.UnknownEntityAttributeType]:
      "The provided entity attribute type is unknown.",
    [schemaValidationErrorCodes.SelfEntityReference]: "Self entity reference.",
    [schemaValidationErrorCodes.ChildNotAllowed]: "Child is not allowed.",
    [schemaValidationErrorCodes.EntityChildrenMismatch]:
      "Children relationship mismatch.",
    [schemaValidationErrorCodes.EntityParentMismatch]:
      "Parent relationship mismatch.",
    [schemaValidationErrorCodes.ParentRequired]: "A parent is required.",
    [schemaValidationErrorCodes.ParentNotAllowed]: "Parent is not allowed.",
    [schemaValidationErrorCodes.UnreachableEntity]:
      "The entity is not in the root and has no parent ID.",
    [schemaValidationErrorCodes.InvalidEntityAttributes]:
      "Validation has failed for some entity attributes.",
    [schemaValidationErrorCodes.InvalidEntitiesAttributes]:
      "Validation has failed for some entities attributes.",
    [schemaValidationErrorCodes.InvalidSchema]:
      "Custom schema validation has failed.",
  };

export type SchemaValidationErrorReason =
  | {
      code: typeof schemaValidationErrorCodes.InvalidRootFormat;
      payload: { root?: unknown };
    }
  | {
      code: typeof schemaValidationErrorCodes.DuplicateRootId;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.DuplicateChildId;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.EmptyRoot;
    }
  | {
      code: typeof schemaValidationErrorCodes.NonexistentEntityId;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntitiesFormat;
      payload: { entities?: unknown };
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityType;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.UnknownEntityType;
      payload: { entityId: string; entityType: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.NonexistentEntityParent;
      payload: { entityId: string; entityParentId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityAttributes;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntityAttributesFormat;
      payload: { entityId: string; entityAttributes: unknown };
    }
  | {
      code: typeof schemaValidationErrorCodes.UnknownEntityAttributeType;
      payload: { entityId: string; attributeName: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.SelfEntityReference;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidChildrenFormat;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.ChildNotAllowed;
      payload: { entityId: string; childId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.RootEntityWithParent;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.EntityChildrenMismatch;
      payload: { entityId: string; childId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.EntityParentMismatch;
      payload: { entityId: string; parentId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.ParentRequired;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.ParentNotAllowed;
      payload: { entityId: string; parentId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.UnreachableEntity;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntityAttributes;
      payload: { entityId: string; attributesErrors: EntityAttributesErrors };
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntitiesAttributes;
      payload: { entitiesAttributesErrors: EntitiesAttributesErrors };
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidSchema;
      payload: { schemaError: unknown };
    };

export class SchemaValidationError extends Error {
  constructor(public reason: SchemaValidationErrorReason) {
    super(schemaValidationErrorMessages[reason.code] ?? "Unknown error");
  }
}

export type BaseSchemaEntity<
  TEntity extends Entity = Entity,
  TType extends string = string,
> = {
  type: TType;
  attributes: AttributesValues<TEntity["attributes"]>;
  parentId?: string;
};

export interface SchemaEntity<TEntity extends Entity = Entity>
  extends BaseSchemaEntity<TEntity> {
  children?: Array<string>;
}

export type Schema<
  TBuilder extends Pick<Builder, "entities"> = Pick<Builder, "entities">,
> = {
  entities: Record<string, SchemaEntity<TBuilder["entities"][string]>>;
  root: ReadonlyArray<string>;
};

export interface SchemaEntityWithId<TEntity extends Entity = Entity>
  extends SchemaEntity<TEntity> {
  id: string;
}

function ensureEntityIsRegistered(
  entity: SchemaEntityWithId,
  builder: Builder,
): Builder["entities"][number] {
  const entityDefinition = getEntityDefinition(entity.type, builder);

  if (!entityDefinition) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnknownEntityType,
      payload: { entityId: entity.id, entityType: entity.type },
    });
  }

  return entityDefinition;
}

function ensureEntityTypeHasValidFormat(entity: SchemaEntityWithId): void {
  if (typeof entity.type !== "string" || entity.type.length === 0) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityType,
      payload: { entityId: entity.id },
    });
  }
}

function ensureEntityAttributesHaveValidFormat(
  entity: SchemaEntityWithId,
): void {
  if (
    typeof entity.attributes !== "object" ||
    Array.isArray(entity.attributes) ||
    entity.attributes === null
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntityAttributesFormat,
      payload: { entityId: entity.id, entityAttributes: entity.attributes },
    });
  }
}

function ensureEntityHasAttributes(entity: SchemaEntityWithId): void {
  if (!entity.attributes) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityAttributes,
      payload: { entityId: entity.id },
    });
  }
}

function ensureEntityAttributeIsRegistered(
  entity: SchemaEntityWithId,
  attributeName: string,
  builder: Builder,
): void {
  const entityDefinition = ensureEntityIsRegistered(entity, builder);

  if (!entityDefinition?.attributes[attributeName]) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnknownEntityAttributeType,
      payload: { entityId: entity.id, attributeName: attributeName },
    });
  }
}

function ensureEntityAttributesAreRegistered(
  entity: SchemaEntityWithId,
  builder: Builder,
): void {
  Object.keys(entity.attributes).forEach((attributeName) =>
    ensureEntityAttributeIsRegistered(entity, attributeName, builder),
  );
}

async function validateEntityAttributes(
  entity: SchemaEntityWithId,
  builder: Builder,
  schema: Schema,
): Promise<AttributesValues> {
  const entityDefinition = ensureEntityIsRegistered(entity, builder);

  const attributesErrors: EntityAttributesErrors = {};

  const newAttributes = {
    ...entity.attributes,
  };

  for (const [attributeName, attribute] of Object.entries(
    entityDefinition.attributes,
  )) {
    try {
      let attributeValue = entity.attributes[attributeName];

      const attributeValidationContext = {
        schema,
        entity,
      };

      const attributeValidator = (value: unknown) =>
        attribute.validate(value, attributeValidationContext);

      const attributeExtensionValidator = entityDefinition.attributesExtensions[
        attributeName
      ]?.validate
        ? (value: unknown) =>
            entityDefinition.attributesExtensions[attributeName]?.validate?.(
              value,
              {
                ...attributeValidationContext,
                validate: attributeValidator,
              },
            )
        : undefined;

      const entityExtensionAttributeValidator =
        builder.entitiesExtensions[entity.type]?.attributes?.[attributeName]
          ?.validate;

      if (entityExtensionAttributeValidator) {
        attributeValue = await entityExtensionAttributeValidator(
          attributeValue,
          {
            ...attributeValidationContext,
            validate: attributeExtensionValidator ?? attributeValidator,
          },
        );
      } else if (attributeExtensionValidator) {
        attributeValue = await attributeExtensionValidator(attributeValue);
      } else {
        attributeValue = await attributeValidator(attributeValue);
      }

      newAttributes[attributeName] = attributeValue;
    } catch (error) {
      attributesErrors[attributeName] = error;
    }
  }

  if (Object.keys(attributesErrors).length) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntityAttributes,
      payload: { entityId: entity.id, attributesErrors },
    });
  }

  return newAttributes;
}

export function ensureEntityOptionalParentIdHasValidReference<
  TEntities extends Record<string, Entity>,
>(
  entity: SchemaEntityWithId<TEntities[string]>,
  entities: Schema<Builder<TEntities>>["entities"],
): SchemaEntityWithId<TEntities[string]> | undefined {
  if (typeof entity.parentId === "undefined") {
    return;
  }

  const parentEntity = entities[entity.parentId];

  if (!parentEntity) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.NonexistentEntityParent,
      payload: { entityId: entity.id, entityParentId: entity.parentId },
    });
  }

  return { ...parentEntity, id: entity.parentId };
}

function ensureEntityParentIdDoesntHaveSelfReference(
  entity: SchemaEntityWithId,
): void {
  if (entity.parentId === entity.id || entity.children?.includes(entity.id)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.SelfEntityReference,
      payload: { entityId: entity.id },
    });
  }
}

function ensureEntityChildrenHaveValidFormat(entity: SchemaEntityWithId): void {
  if (
    typeof entity.children !== "undefined" &&
    !Array.isArray(entity.children)
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidChildrenFormat,
      payload: { entityId: entity.id },
    });
  }
}

export function ensureEntityChildAllowed(
  entity: SchemaEntityWithId,
  childEntity: SchemaEntityWithId,
  builder: Builder,
): void {
  if (!isEntityChildAllowed(entity.type, childEntity.type, builder)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ChildNotAllowed,
      payload: { entityId: entity.id, childId: childEntity.id },
    });
  }
}

function ensureEntityChildrenAreAllowed(
  entity: SchemaEntityWithId,
  builder: Builder,
  entities: Schema["entities"],
): void {
  if (!entity.children) {
    return;
  }

  entity.children.forEach((id) => {
    const childEntity = ensureEntityExists(id, entities);

    ensureEntityChildAllowed(entity, childEntity, builder);
  });
}

function ensureChildIdUnique(
  entity: SchemaEntityWithId,
  childId: string,
): void {
  if (!entity.children) {
    return;
  }

  if (entity.children.filter((id) => id === childId).length > 1) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.DuplicateChildId,
      payload: { entityId: entity.id },
    });
  }
}

function ensureChildrenIdsAreValid(
  entity: SchemaEntityWithId,
  builder: Builder,
  entities: Schema["entities"],
): void {
  if (!entity.children) {
    return;
  }

  entity.children.forEach((childId) => {
    builder.validateEntityId(childId);

    ensureEntityExists(childId, entities);

    ensureChildIdUnique(entity, childId);
  });
}

function ensureEntityHasParentId(
  entity: SchemaEntityWithId,
  parentId: string,
): void {
  if (entity.parentId !== parentId) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.EntityChildrenMismatch,
      payload: { entityId: parentId, childId: entity.id },
    });
  }
}

function ensureEntityChildrenMatchParentIds(
  entity: SchemaEntityWithId,
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
  entity: SchemaEntityWithId,
  entities: Schema["entities"],
) {
  if (!entity.parentId) {
    return;
  }

  const parent = ensureEntityExists(entity.parentId, entities);

  if (!parent.children?.includes(entity.id)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.EntityParentMismatch,
      payload: { entityId: entity.id, parentId: entity.parentId },
    });
  }
}

function ensureEntityCanLackParent(
  entity: SchemaEntityWithId,
  builder: Builder,
): void {
  if (!entity.parentId && isEntityParentRequired(entity.type, builder)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ParentRequired,
      payload: { entityId: entity.id },
    });
  }
}

function ensureEntityParentAllowed(
  entity: SchemaEntityWithId,
  builder: Builder,
  entities: Schema["entities"],
): void {
  if (!entity.parentId) {
    return;
  }

  const parentEntity = ensureEntityExists(entity.parentId, entities);

  if (!isEntityParentAllowed(entity.type, parentEntity.type, builder)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ParentNotAllowed,
      payload: { entityId: entity.id, parentId: entity.parentId },
    });
  }
}

function ensureEntityReachable(
  entity: SchemaEntityWithId,
  root: Schema["root"],
): void {
  if (!entity.parentId && !root.includes(entity.id)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnreachableEntity,
      payload: { entityId: entity.id },
    });
  }
}

function validateEntitySchema<TBuilder extends Builder>(
  entity: SchemaEntityWithId<TBuilder["entities"][string]>,
  builder: TBuilder,
  schema: Schema<TBuilder>,
): SchemaEntity<TBuilder["entities"][string]> {
  builder.validateEntityId(entity.id);

  if (typeof entity.parentId !== "undefined") {
    builder.validateEntityId(entity.parentId);
  }

  ensureEntityTypeHasValidFormat(entity);

  ensureEntityIsRegistered(entity, builder);

  ensureEntityHasAttributes(entity);

  ensureEntityAttributesHaveValidFormat(entity);

  ensureEntityAttributesAreRegistered(entity, builder);

  ensureEntityOptionalParentIdHasValidReference(entity, schema.entities);

  ensureEntityParentIdDoesntHaveSelfReference(entity);

  ensureEntityChildrenHaveValidFormat(entity);

  ensureChildrenIdsAreValid(entity, builder, schema.entities);

  ensureEntityChildrenAreAllowed(entity, builder, schema.entities);

  ensureEntityChildrenMatchParentIds(entity, schema.entities);

  ensureEntityParentIdMatchesParentChildren(entity, schema.entities);

  ensureEntityCanLackParent(entity, builder);

  ensureEntityParentAllowed(entity, builder, schema.entities);

  ensureEntityReachable(entity, schema.root);

  return {
    type: entity.type,
    attributes: entity.attributes,
    ...(entity.parentId ? { parentId: entity.parentId } : {}),
    ...(entity.children ? { children: entity.children } : {}),
  };
}

export function ensureEntityExists<TEntities extends Record<string, Entity>>(
  entityId: string,
  entities: Schema<Builder<TEntities>>["entities"],
): SchemaEntityWithId<TEntities[string]> {
  const entity = entities[entityId];

  if (!entity) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.NonexistentEntityId,
      payload: { entityId },
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
      payload: { entityId },
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
      payload: { entities },
    });
  }
}

function ensureRootHasValidFormat(root: Schema["root"]): void {
  if (!Array.isArray(root)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidRootFormat,
      payload: { root },
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

function validateEntitiesSchema<TBuilder extends Builder>(
  schema: Schema<TBuilder>,
  builder: TBuilder,
): Schema<TBuilder>["entities"] {
  return Object.entries(schema.entities).reduce(
    (result, [key, entity]) => ({
      ...result,
      [key]: validateEntitySchema({ ...entity, id: key }, builder, schema),
    }),
    schema.entities,
  );
}

function ensureRootIdsAreValid(schema: Schema, builder: Builder): void {
  schema.root.forEach((entityId) => {
    builder.validateEntityId(entityId);

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
      payload: { entityId: id },
    });
  }
}

function ensureRootEntitiesDontHaveParents(schema: Schema): void {
  schema.root.forEach((id) =>
    ensureRootEntityDoesntHaveParent(id, schema.entities),
  );
}

export function getEmptySchema<
  TEntities extends Record<string, Entity>,
>(): Schema<Builder<TEntities>> {
  return { entities: {}, root: [] };
}

type SchemValidationResult<TEntities extends Record<string, Entity>> =
  | { data: Schema<Builder<TEntities>>; success: true }
  | { reason: SchemaValidationErrorReason; success: false };

export function validateSchemaShape<TBuilder extends Builder>(
  schema: unknown,
  builder: TBuilder,
): SchemValidationResult<TBuilder["entities"]> {
  const castedSchema = schema as Schema<TBuilder>;

  if (typeof schema === "undefined") {
    return { data: getEmptySchema(), success: true };
  }

  try {
    ensureEntitiesHaveValidFormat(castedSchema.entities);

    ensureRootHasValidFormat(castedSchema.root);

    ensureRootNotEmptyWhenThereAreEntities(castedSchema);

    const validatedEntities = validateEntitiesSchema(castedSchema, builder);

    const computedSchema = {
      entities: validatedEntities,
      root: castedSchema.root,
    };

    ensureRootIdsAreValid(computedSchema, builder);

    ensureRootEntitiesDontHaveParents(computedSchema);

    return { data: computedSchema, success: true };
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return {
        reason: error.reason,
        success: false,
      };
    }

    throw error;
  }
}

export type EntityAttributesErrors<TEntity extends Entity = Entity> = Partial<
  Record<Extract<keyof TEntity["attributes"], string>, unknown>
>;

export type EntitiesAttributesErrors<
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> = Record<string, EntityAttributesErrors<TEntities[string]>>;

async function validateEntitiesAttributes<TBuilder extends Builder>(
  schema: Schema<TBuilder>,
  builder: TBuilder,
): Promise<SchemValidationResult<TBuilder["entities"]>> {
  const entitiesAttributesErrors: EntitiesAttributesErrors = {};

  const newEntities = { ...schema.entities };

  for (const [id, entity] of Object.entries(schema.entities)) {
    try {
      const newAttributes = await validateEntityAttributes(
        { ...entity, id },
        builder,
        schema,
      );

      const newEntity = newEntities[id];

      if (!newEntity) {
        throw new Error("Entity not found.");
      }

      newEntity.attributes = newAttributes as typeof entity.attributes;
    } catch (error) {
      if (
        error instanceof SchemaValidationError &&
        error.reason.code === schemaValidationErrorCodes.InvalidEntityAttributes
      ) {
        entitiesAttributesErrors[id] = error.reason.payload.attributesErrors;
      } else {
        throw error;
      }
    }
  }

  if (Object.keys(entitiesAttributesErrors).length) {
    return {
      success: false,
      reason: new SchemaValidationError({
        code: schemaValidationErrorCodes.InvalidEntitiesAttributes,
        payload: { entitiesAttributesErrors },
      }).reason,
    };
  }

  return {
    success: true,
    data: { root: schema.root, entities: newEntities },
  };
}

export async function validateSchema<TBuilder extends Builder>(
  schema: unknown,
  builder: TBuilder,
): Promise<SchemValidationResult<TBuilder["entities"]>> {
  const schemaIntegrityValidationResult = validateSchemaShape(schema, builder);

  if (!schemaIntegrityValidationResult.success) {
    return schemaIntegrityValidationResult;
  }

  const entitiesAttributesValidationResult = await validateEntitiesAttributes(
    schemaIntegrityValidationResult.data,
    builder,
  );

  if (!entitiesAttributesValidationResult.success) {
    return entitiesAttributesValidationResult;
  }

  try {
    const newSchema = await builder.validateSchema(
      entitiesAttributesValidationResult.data,
    );

    return {
      success: true,
      data: newSchema,
    };
  } catch (error) {
    return {
      success: false,
      reason: new SchemaValidationError({
        code: schemaValidationErrorCodes.InvalidSchema,
        payload: { schemaError: error },
      }).reason,
    };
  }
}
