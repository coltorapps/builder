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
  InvalidRoot: "InvalidRoot",
  InvalidEntities: "InvalidEntities",
  NoEntityType: "NoEntityType",
  InvalidEntityType: "InvalidEntityType",
  InvalidParentId: "InvalidParentId",
  NonExistentEntityParent: "NonExistentEntityParent",
  EntityInputsRequired: "EntityInputsRequired",
  InvalidEntityInputs: "InvalidEntityInputs",
  UndefinedEntityInput: "UndefinedEntityInput",
} as const;

export type SchemaValidationErrorCode =
  (typeof schemaValidationErrorCodes)[keyof typeof schemaValidationErrorCodes];

const schemaValidationErrorMessages: Record<SchemaValidationErrorCode, string> =
  {
    InvalidRoot: "Root must be an array of strings.",
    InvalidEntities: "Entities must be an object.",
    NoEntityType: "No entity type provided.",
    InvalidEntityType: "Unknown entity type provided.",
    InvalidParentId: "Invalid parent ID provided.",
    NonExistentEntityParent:
      "The provided parent ID references a non-existent entity.",
    EntityInputsRequired: "No entity inputs provided.",
    InvalidEntityInputs: "Invalid entity inputs provided.",
    UndefinedEntityInput: "Unknown entity input type provided.",
  };

type SchemaValidationErrorCause =
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntities;
      entities?: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidRoot;
      root?: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.NoEntityType;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntityType;
      entityId: string;
      entityType: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidParentId;
      entityId: string;
      entityParentId?: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.NonExistentEntityParent;
      entityId: string;
      entityParentId?: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.EntityInputsRequired;
      entityId: string;
    }
  | {
      code: typeof schemaValidationErrorCodes.InvalidEntityInputs;
      entityId: string;
      entityInputs?: unknown;
    }
  | {
      code: typeof schemaValidationErrorCodes.UndefinedEntityInput;
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
      code: schemaValidationErrorCodes.InvalidEntityType,
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

  if (
    entity.inputs.hasOwnProperty(inputName) &&
    !entityDefinition.inputs.some((input) => input.name === inputName)
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.UndefinedEntityInput,
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
      code: schemaValidationErrorCodes.NoEntityType,
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

  if (
    entity.parentId &&
    !schema.entities.some((entitySchema) => entitySchema.id === entity.parentId)
  ) {
    builder.entityId.validate(entity.parentId);

    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.NonExistentEntityParent,
      entityId: entity.id,
      entityParentId: entity.parentId,
    });
  }

  if (!entity.inputs) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.EntityInputsRequired,
      entityId: entity.id,
    });
  }

  if (typeof entity.inputs !== "object") {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntityInputs,
      entityId: entity.id,
      entityInputs: entity.inputs,
    });
  }

  for (const inputName in entity.inputs) {
    ensureEntityInputIsDefined(entity, inputName, builder);
  }
}

export interface StoreSchema<TBuilder extends BaseBuilder> {
  entities: Array<StoreEntity<TBuilder>>;
  root: StoreData<TBuilder>["root"];
}

function validateSchema<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  schema: StoreSchema<TBuilder>,
): void {
  if (typeof schema.entities !== "object") {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidEntities,
      entities: schema.entities,
    });
  }

  if (
    !Array.isArray(schema.root) ||
    schema.root.some((item) => typeof item !== "string")
  ) {
    throw new SchemaValidationError({
      code: schemaValidationErrorCodes.InvalidRoot,
      root: schema.root,
    });
  }

  schema.entities.forEach((entity) =>
    validateEntity(entity, { builder, schema }),
  );
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
    entities: new Map(schema.entities.map((entity) => [entity.id, entity])),
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
