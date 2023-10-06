import {
  getEntityDefinition,
  isEntityChildAllowed,
  isEntityParentRequired,
  type Builder,
} from "./builder";
import { type InputsValues } from "./input";
import { type SchemaStoreData } from "./schema-store";
import { deserializeSchemaStoreData } from "./schema-store-serialization";
import { type KeyofUnion, type OptionalPropsIfUndefined } from "./utils";

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
  NonexistentEntityParent: "NonexistentEntityParent",
  MissingEntityInputs: "MissingEntityInputs",
  InvalidEntityInputsFormat: "InvalidEntityInputsFormat",
  UnknownEntityInputType: "UnknownEntityInputType",
  InvalidEntityInputs: "InvalidEntityInputs",
  InvalidEntitiesInputs: "InvalidEntitiesInputs",
  SelfEntityReference: "SelfEntityReference",
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
    [schemaValidationErrorCodes.MissingEntityInputs]:
      "Entity inputs are missing.",
    [schemaValidationErrorCodes.InvalidEntityInputsFormat]:
      "The provided entity inputs are invalid.",
    [schemaValidationErrorCodes.UnknownEntityInputType]:
      "The provided entity input type is unknown.",
    [schemaValidationErrorCodes.SelfEntityReference]: "Self entity reference.",
    [schemaValidationErrorCodes.ChildNotAllowed]: "Child is not allowed.",
    [schemaValidationErrorCodes.EntityChildrenMismatch]:
      "Children relationship mismatch.",
    [schemaValidationErrorCodes.EntityParentMismatch]:
      "Parent relationship mismatch.",
    [schemaValidationErrorCodes.ParentRequired]: "A parent is required.",
    [schemaValidationErrorCodes.UnreachableEntity]:
      "The entity is not in the root and has no parent ID.",
    [schemaValidationErrorCodes.InvalidEntityInputs]:
      "Validation has failed for some entity inputs.",
    [schemaValidationErrorCodes.InvalidEntitiesInputs]:
      "Validation has failed for some entities inputs.",
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
      code: typeof schemaValidationErrorCodes.MissingEntityInputs;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntityInputsFormat;
      payload: { entityId: string; entityInputs: unknown };
    }
  | {
      code: typeof schemaValidationErrorCodes.UnknownEntityInputType;
      payload: { entityId: string; inputName: string };
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
      code: typeof schemaValidationErrorCodes.UnreachableEntity;
      payload: { entityId: string };
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntityInputs;
      payload: { entityId: string; inputsErrors: EntityInputsErrors };
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntitiesInputs;
      payload: { entitiesInputsErrors: EntitiesInputsErrors };
    };

export class SchemaValidationError extends Error {
  constructor(public reason: SchemaValidationErrorReason) {
    super(schemaValidationErrorMessages[reason.code] ?? "Unknown error");
  }
}

export type BaseSchemaEntity<
  TBuilder extends Builder = Builder,
  TExtend = object,
> = {
  [K in TBuilder["entities"][number]["name"]]: {
    type: K;
    inputs: OptionalPropsIfUndefined<
      InputsValues<Extract<TBuilder["entities"][number], { name: K }>["inputs"]>
    >;
    parentId?: string;
  } & TExtend;
}[TBuilder["entities"][number]["name"]];

export type SchemaEntity<TBuilder extends Builder = Builder> = BaseSchemaEntity<
  TBuilder,
  {
    children?: Array<string>;
  }
>;

export type Schema<TBuilder extends Builder = Builder> = {
  entities: Record<string, SchemaEntity<TBuilder>>;
  root: ReadonlyArray<string>;
};

export type SchemaEntityWithId<TBuilder extends Builder = Builder> =
  SchemaEntity<TBuilder> & { id: string };

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

function ensureEntityInputsHaveValidFormat(entity: SchemaEntityWithId): void {
  if (
    typeof entity.inputs !== "object" ||
    Array.isArray(entity.inputs) ||
    entity.inputs === null
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntityInputsFormat,
      payload: { entityId: entity.id, entityInputs: entity.inputs },
    });
  }
}

function ensureEntityHasInputs(entity: SchemaEntityWithId): void {
  if (!entity.inputs) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityInputs,
      payload: { entityId: entity.id },
    });
  }
}

function ensureEntityInputIsRegistered(
  entity: SchemaEntityWithId,
  inputName: string,
  builder: Builder,
): void {
  const entityDefinition = ensureEntityIsRegistered(entity, builder);

  if (!entityDefinition?.inputs.some((input) => input.name === inputName)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnknownEntityInputType,
      payload: { entityId: entity.id, inputName: inputName },
    });
  }
}

function ensureEntityInputsAreRegistered(
  entity: SchemaEntityWithId,
  builder: Builder,
): void {
  Object.keys(entity.inputs).forEach((inputName) =>
    ensureEntityInputIsRegistered(entity, inputName, builder),
  );
}

async function validateEntityInputs(
  entity: SchemaEntityWithId,
  dependencies: {
    builder: Builder;
    schemaStoreData: SchemaStoreData;
  },
): Promise<SchemaEntityWithId["inputs"]> {
  const entityDefinition = ensureEntityIsRegistered(
    entity,
    dependencies.builder,
  );

  const newInputs = { ...entity.inputs };

  const inputsErrors: EntityInputsErrors = {};

  const schemaStoreEntity = dependencies.schemaStoreData.entities.get(
    entity.id,
  );

  if (!schemaStoreEntity) {
    throw Error("Entity not found.");
  }

  for (const input of entityDefinition.inputs) {
    try {
      newInputs[input.name] = await input.validate(entity.inputs[input.name], {
        schema: dependencies.schemaStoreData,
        entity: {
          ...schemaStoreEntity,
          id: entity.id,
        },
      });
    } catch (error) {
      inputsErrors[input.name] = error;
    }
  }

  if (Object.keys(inputsErrors).length) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntityInputs,
      payload: { entityId: entity.id, inputsErrors },
    });
  }

  return newInputs;
}

export function ensureEntityOptionalParentIdHasValidReference<
  TBuilder extends Builder,
>(
  entity: SchemaEntityWithId<TBuilder>,
  entities: Schema<TBuilder>["entities"],
): SchemaEntityWithId<TBuilder> | undefined {
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
  dependencies: {
    builder: Builder;
    entities: Schema["entities"];
  },
): void {
  if (!entity.children) {
    return;
  }

  entity.children.forEach((id) => {
    const childEntity = ensureEntityExists(id, dependencies.entities);

    ensureEntityChildAllowed(entity, childEntity, dependencies.builder);
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

export function ensureEntityCanLackParent(
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

export function ensureEntityReachable(
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
  entity: SchemaEntityWithId<TBuilder>,
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

  ensureEntityOptionalParentIdHasValidReference(
    entity,
    dependencies.schema.entities,
  );

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

export function ensureEntityExists<TBuilder extends Builder>(
  entityId: string,
  entities: Schema<TBuilder>["entities"],
): SchemaEntityWithId<TBuilder> {
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
      payload: { entityId: id },
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

type SchemValidationResult<TBuilder extends Builder> =
  | { data: Schema<TBuilder>; success: true }
  | { reason: SchemaValidationErrorReason; success: false };

export function validateSchemaIntegrity<TBuilder extends Builder>(
  schema: Schema<TBuilder>,
  dependencies: {
    builder: TBuilder;
  },
): SchemValidationResult<TBuilder> {
  if (typeof schema === "undefined") {
    return { data: getEmptySchema(), success: true };
  }

  try {
    ensureEntitiesHaveValidFormat(schema.entities);

    ensureRootHasValidFormat(schema.root);

    ensureRootNotEmptyWhenThereAreEntities(schema);

    const validatedEntities = validateEntitiesSchema(
      schema,
      dependencies.builder,
    );

    const computedSchema = {
      entities: validatedEntities,
      root: schema.root,
    };

    ensureRootIdsAreValid(computedSchema, dependencies.builder);

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

export type EntityInputsErrors<TBuilder extends Builder = Builder> = Partial<
  Record<KeyofUnion<SchemaEntity<TBuilder>["inputs"]>, unknown>
>;

export type EntitiesInputsErrors<TBuilder extends Builder = Builder> = Record<
  string,
  EntityInputsErrors<TBuilder>
>;

async function validateEntitiesInputs<TBuilder extends Builder>(
  schema: Schema<TBuilder>,
  dependencies: {
    builder: TBuilder;
  },
): Promise<SchemValidationResult<TBuilder>> {
  const newSchema: Schema<TBuilder> = {
    ...schema,
    entities: {
      ...schema.entities,
    },
  };

  const entitiesInputsErrors: EntitiesInputsErrors = {};

  const schemaStoreData = deserializeSchemaStoreData(newSchema);

  for (const [id, entity] of Object.entries(schema.entities)) {
    try {
      newSchema.entities[id] = {
        ...entity,
        inputs: await validateEntityInputs(
          { ...entity, id },
          {
            builder: dependencies.builder,
            schemaStoreData,
          },
        ),
      };
    } catch (error) {
      if (
        error instanceof SchemaValidationError &&
        error.reason.code === schemaValidationErrorCodes.InvalidEntityInputs
      ) {
        entitiesInputsErrors[id] = error.reason.payload.inputsErrors;
      } else {
        throw error;
      }
    }
  }

  if (Object.keys(entitiesInputsErrors).length) {
    return {
      success: false,
      reason: new SchemaValidationError({
        code: schemaValidationErrorCodes.InvalidEntitiesInputs,
        payload: { entitiesInputsErrors },
      }).reason,
    };
  }

  return {
    success: true,
    data: newSchema,
  };
}

export async function validateSchema<TBuilder extends Builder>(
  schema: Schema<TBuilder>,
  dependencies: {
    builder: TBuilder;
  },
): Promise<SchemValidationResult<TBuilder>> {
  const validatedSchema = validateSchemaIntegrity(schema, dependencies);

  if (!validatedSchema.success) {
    return validatedSchema;
  }

  return validateEntitiesInputs(validatedSchema.data, dependencies);
}
