import { type Builder } from "./builder";
import { type InputsValues } from "./input";
import { type OptionalPropsIfUndefined } from "./utils";

export const schemaValidationErrorCodes = {
  InvalidRootFormat: "InvalidRootFormat",
  DuplicateRootId: "DuplicateRootId",
  DuplicateChildId: "DuplicateChildId",
  RootEntityWithParent: "RootEntityWithParent",
  EmptyRoot: "EmptyRoot",
  MissingEntityId: "MissingEntityId",
  InvalidEntitiesFormat: "InvalidEntitiesFormat",
  MissingEntityType: "MissingEntityType",
  UnknownEntityType: "UnknownEntityType",
  InvalidChildrenFormat: "InvalidChildrenFormat",
  MissingEntityParent: "MissingEntityParent",
  MissingEntityInputs: "MissingEntityInputs",
  InvalidEntityInputsFormat: "InvalidEntityInputsFormat",
  UnknownEntityInputType: "UnknownEntityInputType",
  SelfEntityReference: "SelfEntityReference",
  ChildrenNotAllowed: "ChildrenNotAllowed",
  ChildNotAllowed: "ChildNotAllowed",
  EntityChildrenMismatch: "EntityChildrenMismatch",
  ParentRequired: "ParentRequired",
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
    [schemaValidationErrorCodes.MissingEntityId]:
      "A provided entity ID does not exist.",
    [schemaValidationErrorCodes.InvalidEntitiesFormat]:
      "Entities should be an object containing valid entities.",
    [schemaValidationErrorCodes.MissingEntityType]: "Entity type is missing.",
    [schemaValidationErrorCodes.UnknownEntityType]:
      "The provided entity type is unknown.",
    [schemaValidationErrorCodes.InvalidChildrenFormat]:
      "The provided children are invalid.",
    [schemaValidationErrorCodes.MissingEntityParent]:
      "The parent ID references a non-existent entity.",
    [schemaValidationErrorCodes.MissingEntityInputs]:
      "Entity inputs are missing.",
    [schemaValidationErrorCodes.InvalidEntityInputsFormat]:
      "The provided entity inputs are invalid.",
    [schemaValidationErrorCodes.UnknownEntityInputType]:
      "The provided entity input type is unknown.",
    [schemaValidationErrorCodes.SelfEntityReference]: "Self entity reference.",
    [schemaValidationErrorCodes.ChildrenNotAllowed]:
      "Children are not allowed.",
    [schemaValidationErrorCodes.ChildNotAllowed]: "Child is not allowed.",
    [schemaValidationErrorCodes.EntityChildrenMismatch]:
      "Children relationship mismatch.",
    [schemaValidationErrorCodes.EntityParentMismatch]:
      "Parent relationship mismatch.",
    [schemaValidationErrorCodes.ParentRequired]: "A parent is required.",
    [schemaValidationErrorCodes.UnreachableEntity]:
      "The entity is not in the root and has no parent ID.",
  };

export type SchemaValidationErrorCause =
  | {
      code: typeof schemaValidationErrorCodes.InvalidRootFormat;
      root?: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.DuplicateRootId;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.DuplicateChildId;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.EmptyRoot;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityId;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntitiesFormat;
      entities?: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityType;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.UnknownEntityType;
      entityId: string;
      entityType: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityParent;
      entityId: string;
      entityParentId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityInputs;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntityInputsFormat;
      entityId: string;
      entityInputs: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.UnknownEntityInputType;
      entityId: string;
      inputName: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.SelfEntityReference;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidChildrenFormat;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.ChildrenNotAllowed;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.ChildNotAllowed;
      entityId: string;
      childId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.RootEntityWithParent;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.EntityChildrenMismatch;
      entityId: string;
      childId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.EntityParentMismatch;
      entityId: string;
      parentId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.ParentRequired;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.UnreachableEntity;
      entityId: string;
    };

export class SchemaValidationError extends Error {
  constructor(public cause: SchemaValidationErrorCause) {
    super(schemaValidationErrorMessages[cause.code] ?? "Unknown error");
  }
}

export type SchemaEntity<TBuilder extends Builder = Builder> = {
  [K in TBuilder["entities"][number]["name"]]: {
    type: K;
    inputs: OptionalPropsIfUndefined<
      InputsValues<Extract<TBuilder["entities"][number], { name: K }>["inputs"]>
    >;
    children?: Array<string>;
    parentId?: string;
  };
}[TBuilder["entities"][number]["name"]];

export interface Schema<TBuilder extends Builder = Builder> {
  entities: Record<string, SchemaEntity<TBuilder>>;
  root: string[];
}

type EntityWithId<TBuilder extends Builder = Builder> =
  SchemaEntity<TBuilder> & { id: string };

function getEntityDefinition(
  entity: EntityWithId,
  builder: Builder,
): Builder["entities"][number] | undefined {
  return builder.entities.find(
    (builderEntity) => builderEntity.name === entity.type,
  );
}

function ensureEntityIsRegistered(
  entity: EntityWithId,
  builder: Builder,
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

function ensureEntityTypeHasValidFormat(entity: EntityWithId): void {
  if (typeof entity.type !== "string" || entity.type.length === 0) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityType,
      entityId: entity.id,
    });
  }
}

function ensureEntityInputsHaveValidFormat(entity: EntityWithId): void {
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

function ensureEntityHasInputs(entity: EntityWithId): void {
  if (!entity.inputs) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityInputs,
      entityId: entity.id,
    });
  }
}

function ensureEntityInputIsRegistered(
  entity: EntityWithId,
  inputName: string,
  builder: Builder,
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
  entity: EntityWithId,
  builder: Builder,
): void {
  Object.keys(entity.inputs).forEach((inputName) =>
    ensureEntityInputIsRegistered(entity, inputName, builder),
  );
}

export function ensureEntityParentIdHasValidReference(
  entity: EntityWithId,
  entities: Schema["entities"],
): EntityWithId | undefined {
  if (!entity.parentId) {
    return;
  }

  const parentEntity = entities[entity.parentId];

  if (!parentEntity) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityParent,
      entityId: entity.id,
      entityParentId: entity.parentId,
    });
  }

  return { ...parentEntity, id: entity.parentId };
}

function ensureEntityParentIdDoesntHaveSelfReference(
  entity: EntityWithId,
): void {
  if (entity.parentId && entity.parentId === entity.id) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.SelfEntityReference,
      entityId: entity.id,
    });
  }
}

function ensureEntityChildrenHaveValidFormat(entity: EntityWithId): void {
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

export function ensureEntityChildAllowed(
  entity: EntityWithId,
  childEntity: EntityWithId,
  builder: Builder,
): void {
  const allowedChildren = builder.childrenAllowed[entity.type];

  if (!allowedChildren) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ChildrenNotAllowed,
      entityId: entity.id,
    });
  }

  if (allowedChildren !== true && !allowedChildren.includes(childEntity.type)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ChildNotAllowed,
      entityId: entity.id,
      childId: childEntity.id,
    });
  }
}

function ensureEntityChildrenAreAllowed(
  entity: EntityWithId,
  dependencies: {
    builder: Builder;
    entities: Schema["entities"];
  },
): void {
  if (!entity.children) {
    return;
  }

  const allowedChildren = dependencies.builder.childrenAllowed[entity.type];

  if (!allowedChildren) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ChildrenNotAllowed,
      entityId: entity.id,
    });
  }

  entity.children.forEach((id) => {
    const childEntity = ensureEntityExists(id, dependencies.entities);

    ensureEntityChildAllowed(entity, childEntity, dependencies.builder);
  });
}

function ensureChildIdUnique(entity: EntityWithId, childId: string): void {
  if (!entity.children) {
    return;
  }

  if (entity.children.filter((id) => id === childId).length > 1) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.DuplicateChildId,
      entityId: entity.id,
    });
  }
}

function ensureChildrenIdsAreValid(
  entity: EntityWithId,
  dependencies: {
    builder: Builder;
    entities: Schema["entities"];
  },
): void {
  if (!entity.children) {
    return;
  }

  entity.children.forEach((childId) => {
    dependencies.builder.entityId.validate(childId);

    ensureEntityExists(childId, dependencies.entities);

    ensureChildIdUnique(entity, childId);
  });
}

function ensureEntityHasParentId(entity: EntityWithId, parentId: string): void {
  if (entity.parentId !== parentId) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.EntityChildrenMismatch,
      entityId: parentId,
      childId: entity.id,
    });
  }
}

function ensureEntityChildrenMatchParentIds(
  entity: EntityWithId,
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
  entity: EntityWithId,
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

export function ensureEntityCanLackParent(
  entity: EntityWithId,
  builder: Builder,
): void {
  if (!entity.parentId && builder.parentRequired.includes(entity.type)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.ParentRequired,
      entityId: entity.id,
    });
  }
}

export function ensureEntityReachable(
  entity: EntityWithId,
  root: Schema["root"],
): void {
  if (!entity.parentId && !root.includes(entity.id)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnreachableEntity,
      entityId: entity.id,
    });
  }
}

function validateEntitySchema<TBuilder extends Builder>(
  entity: EntityWithId<TBuilder>,
  dependencies: {
    builder: TBuilder;
    schema: Schema<TBuilder>;
  },
): SchemaEntity<TBuilder> {
  dependencies.builder.entityId.validate(entity.id);

  if (typeof entity.parentId !== "undefined") {
    dependencies.builder.entityId.validate(entity.parentId);
  }

  ensureEntityTypeHasValidFormat(entity);

  ensureEntityIsRegistered(entity, dependencies.builder);

  ensureEntityHasInputs(entity);

  ensureEntityInputsHaveValidFormat(entity);

  ensureEntityInputsAreRegistered(entity, dependencies.builder);

  ensureEntityParentIdHasValidReference(entity, dependencies.schema.entities);

  ensureEntityParentIdDoesntHaveSelfReference(entity);

  ensureEntityChildrenHaveValidFormat(entity);

  ensureChildrenIdsAreValid(entity, {
    builder: dependencies.builder,
    entities: dependencies.schema.entities,
  });

  ensureEntityChildrenAreAllowed(entity, {
    builder: dependencies.builder,
    entities: dependencies.schema.entities,
  });

  ensureEntityChildrenMatchParentIds(entity, dependencies.schema.entities);

  ensureEntityParentIdMatchesParentChildren(
    entity,
    dependencies.schema.entities,
  );

  ensureEntityCanLackParent(entity, dependencies.builder);

  ensureEntityReachable(entity, dependencies.schema.root);

  return {
    type: entity.type,
    inputs: entity.inputs,
    ...(entity.parentId ? { parentId: entity.parentId } : {}),
    ...(entity.children ? { children: entity.children } : {}),
  };
}

export function ensureEntityExists(
  entityId: string,
  entities: Schema["entities"],
): EntityWithId {
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

function validateEntitiesSchema<TBuilder extends Builder>(
  schema: Schema<TBuilder>,
  builder: TBuilder,
): Schema<TBuilder>["entities"] {
  return Object.entries(schema.entities).reduce(
    (result, [key, entity]) => ({
      ...result,
      [key]: validateEntitySchema({ ...entity, id: key }, { builder, schema }),
    }),
    schema.entities,
  );
}

function ensureRootIdsAreValid(schema: Schema, builder: Builder): void {
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

export function getEmptySchema<TBuilder extends Builder>(): Schema<TBuilder> {
  return { entities: {}, root: [] };
}

export function validateSchema<TBuilder extends Builder>(
  builder: TBuilder,
  schema?: Schema<TBuilder>,
): Schema<TBuilder> {
  if (typeof schema === "undefined") {
    return getEmptySchema();
  }

  ensureEntitiesHaveValidFormat(schema.entities);

  ensureRootHasValidFormat(schema.root);

  ensureRootNotEmptyWhenThereAreEntities(schema);

  const validatedEntities = validateEntitiesSchema(schema, builder);

  const computedSchema = {
    entities: validatedEntities,
    root: schema.root,
  };

  ensureRootIdsAreValid(computedSchema, builder);

  ensureRootEntitiesDontHaveParents(computedSchema);

  return computedSchema;
}
