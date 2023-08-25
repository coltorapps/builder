import { type Builder, type BuilderEntities } from "./builder";
import { createDataManager } from "./data-manager";
import { type InputsValues } from "./input";
import { type Subscribe } from "./subscription-manager";
import { type OptionalPropsIfUndefined } from "./utils";

type BaseStoreEntity<TEntities extends BuilderEntities> = {
  [K in TEntities[number]["name"]]: {
    type: K;
    inputs: OptionalPropsIfUndefined<
      InputsValues<Extract<TEntities[number], { name: K }>["inputs"]>
    >;
    parentId?: string;
  };
}[TEntities[number]["name"]];

export type StoreEntity<TBuilder extends BaseBuilder> = {
  id: string;
} & BaseStoreEntity<TBuilder["entities"]>;

type EntityMutationFields = {
  index?: number;
  parentId?: BaseStoreEntity<BuilderEntities>["parentId"];
};

type NewEntity<TBuilder extends BaseBuilder> = BaseStoreEntity<
  TBuilder["entities"]
> &
  EntityMutationFields;

export interface StoreData<TBuilder extends BaseBuilder> {
  entities: Map<string, StoreEntity<TBuilder>>;
  root: string[];
}

export interface Store<TBuilder extends BaseBuilder> {
  builder: TBuilder;
  getData(): StoreData<TBuilder>;
  subscribe: Subscribe<StoreData<TBuilder>>;
  addEntity(entity: NewEntity<TBuilder>): StoreEntity<TBuilder>;
}

type BaseBuilder = Builder<
  BuilderEntities,
  Record<string, true | ReadonlyArray<string> | undefined>,
  ReadonlyArray<string>
>;

const schemaValidationErrorCodes = {
  InvalidRootFormat: "InvalidRootFormat",
  DuplicateRootId: "DuplicateRootId",
  MissingRootId: "MissingRootId",
  MissingEntityId: "MissingEntityId",
  EntityKeyIdMismatch: "EntityKeyIdMismatch",
  DuplicateEntityId: "DuplicateEntityId",
  InvalidEntitiesFormat: "InvalidEntitiesFormat",
  MissingEntityType: "MissingEntityType",
  UnknownEntityType: "UnknownEntityType",
  InvalidParentId: "InvalidParentId",
  MissingEntityParent: "MissingEntityParent",
  MissingEntityInputs: "MissingEntityInputs",
  InvalidEntityInputsFormat: "InvalidEntityInputsFormat",
  UnknownEntityInputType: "UnknownEntityInputType",
} as const;

export type SchemaValidationErrorCode =
  (typeof schemaValidationErrorCodes)[keyof typeof schemaValidationErrorCodes];

const schemaValidationErrorMessages: Record<SchemaValidationErrorCode, string> =
  {
    InvalidRootFormat: "The root must be an array of strings.",
    DuplicateRootId: "Duplicate IDs detected in the root.",
    MissingRootId: "A provided ID in the root does not exist.",
    MissingEntityId: "A provided entity ID does not exist.",
    EntityKeyIdMismatch: "The entity key does not match the ID.",
    InvalidEntitiesFormat:
      "Entities should be an object containing valid entities.",
    DuplicateEntityId: "Duplicate entity IDs detected.",
    MissingEntityType: "Entity type is missing.",
    UnknownEntityType: "The provided entity type is unknown.",
    InvalidParentId: "The provided parent ID is invalid.",
    MissingEntityParent: "The parent ID references a non-existent entity.",
    MissingEntityInputs: "Entity inputs are missing.",
    InvalidEntityInputsFormat: "The provided entity inputs are invalid.",
    UnknownEntityInputType: "The provided entity input type is unknown.",
  };

type SchemaValidationErrorCause =
  | {
      code: typeof schemaValidationErrorCodes.InvalidRootFormat;
      root?: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.DuplicateRootId;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingRootId;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.EntityKeyIdMismatch;
      key: string;
      entityId: string;
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
      code: typeof schemaValidationErrorCodes.DuplicateEntityId;
      entityId: string;
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
      code: typeof schemaValidationErrorCodes.InvalidParentId;
      entityId: string;
      entityParentId?: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityParent;
      entityId: string;
      entityParentId?: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.MissingEntityInputs;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntityInputsFormat;
      entityId: string;
      entityInputs?: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.UnknownEntityInputType;
      entityId: string;
      inputName: string;
    };

export class SchemaValidationError extends Error {
  constructor(public cause: SchemaValidationErrorCause) {
    super(schemaValidationErrorMessages[cause.code] ?? "Unkown error");
  }
}

function getEntityDefinition<TBuilder extends BaseBuilder>(
  entity: StoreEntity<TBuilder>,
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

function ensureEntityInputIsDefined<TBuilder extends BaseBuilder>(
  entity: StoreEntity<TBuilder>,
  inputName: string,
  builder: TBuilder,
) {
  const entityDefinition = getEntityDefinition(entity, builder);

  if (!entityDefinition.inputs.some((input) => input.name === inputName)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UnknownEntityInputType,
      entityId: entity.id,
      inputName: inputName,
    });
  }
}

export function validateEntity<TBuilder extends BaseBuilder>(
  entity: StoreEntity<TBuilder>,
  {
    builder,
    schema,
  }: {
    builder: TBuilder;
    schema: StoreSchema<TBuilder>;
  },
): void {
  builder.entityId.validate(entity.id);

  if (typeof entity.type !== "string" || entity.type.length === 0) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityType,
      entityId: entity.id,
    });
  }

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
    builder.entityId.validate(entity.parentId);

    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityParent,
      entityId: entity.id,
      entityParentId: entity.parentId,
    });
  }

  if (!entity.inputs) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityInputs,
      entityId: entity.id,
    });
  }

  if (typeof entity.inputs !== "object") {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntityInputsFormat,
      entityId: entity.id,
      entityInputs: entity.inputs,
    });
  }

  Object.keys(entity.inputs).forEach((inputName) =>
    ensureEntityInputIsDefined(entity, inputName, builder),
  );
}

export interface StoreSchema<TBuilder extends BaseBuilder> {
  entities: Record<string, StoreEntity<TBuilder>>;
  root: StoreData<TBuilder>["root"];
}

function ensureEntityIdExists(
  entityId: string,
  entities: StoreSchema<BaseBuilder>["entities"],
): void {
  const entitiesIds = Object.keys(entities);

  if (!entitiesIds.includes(entityId)) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.MissingEntityId,
      entityId,
    });
  }
}

function ensureRootEntityIdExists(
  ...args: Parameters<typeof ensureEntityIdExists>
): void {
  try {
    ensureEntityIdExists(...args);
  } catch (e) {
    if (
      e instanceof SchemaValidationError &&
      e.cause.code === schemaValidationErrorCodes.MissingEntityId
    ) {
      throw new SchemaValidationError({
        code: schemaValidationErrorCodes.MissingRootId,
        entityId: e.cause.entityId,
      });
    }

    throw e;
  }
}

function ensureEntityIdUnique(
  entityId: string,
  entities: StoreSchema<BaseBuilder>["entities"],
): void {
  if (
    Object.values(entities).filter((entity) => entity.id === entityId).length >
    1
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.DuplicateEntityId,
      entityId,
    });
  }
}

function ensureRootEntityIdUnique(
  entityId: string,
  root: StoreSchema<BaseBuilder>["root"],
): void {
  if (root.filter((id) => id === entityId).length > 1) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.DuplicateRootId,
      entityId,
    });
  }
}

function ensureEntityKeyMatchesId(
  key: string,
  entity: StoreEntity<BaseBuilder>,
): void {
  if (key !== entity.id) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.EntityKeyIdMismatch,
      key,
      entityId: entity.id,
    });
  }
}

function validateSchema<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  schema: StoreSchema<TBuilder>,
): void {
  if (typeof schema.entities !== "object") {
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

  Object.entries(schema.entities).forEach(([key, entity]) => {
    validateEntity(entity, { builder, schema });

    ensureEntityKeyMatchesId(key, entity);

    ensureEntityIdUnique(entity.id, schema.entities);
  });

  schema.root.forEach((entityId) => {
    ensureRootEntityIdExists(entityId, schema.entities);

    ensureRootEntityIdUnique(entityId, schema.root);
  });
}

function transformStoreDataToSchema<TBuilder extends BaseBuilder>(
  storeData: StoreData<TBuilder>,
): StoreSchema<TBuilder> {
  return {
    entities: Object.fromEntries(
      storeData.entities,
    ) as unknown as StoreSchema<TBuilder>["entities"],
    root: storeData.root,
  };
}

export function createStore<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  schema: StoreSchema<TBuilder>,
): Store<TBuilder> {
  validateSchema(builder, schema);

  const { getData, setData, subscribe } = createDataManager<
    StoreData<TBuilder>
  >({
    entities: new Map(Object.entries(schema.entities)),
    root: schema.root,
  });

  return {
    builder,
    getData,
    subscribe,
    addEntity(newEntity) {
      const computedEntity = {
        ...newEntity,
        id: builder.entityId.generate(),
      };

      validateEntity(computedEntity, {
        builder,
        schema: transformStoreDataToSchema<TBuilder>(getData()),
      });

      setData((data) => ({
        ...data,
        entities: data.entities.set(computedEntity.id, computedEntity),
      }));

      return computedEntity;
    },
  };
}
