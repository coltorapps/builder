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

const entityValidationErrorCodes = {
  NoEntityType: "NoEntityType",
  InvalidEntityType: "InvalidEntityType",
  InvalidParentId: "InvalidParentId",
  NonExistentParent: "NonExistentParent",
  EntityInputsRequired: "EntityInputsRequired",
  InvalidEntityInputs: "InvalidEntityInputs",
  UndefinedEntityInput: "UndefinedEntityInput",
} as const;

export type EntityValidationErrorCode =
  (typeof entityValidationErrorCodes)[keyof typeof entityValidationErrorCodes];

const entityValidationErrorMessages: Record<EntityValidationErrorCode, string> =
  {
    NoEntityType: "No entity type provided.",
    InvalidEntityType: "Unknown entity type provided.",
    InvalidParentId: "Invalid parent ID provided.",
    NonExistentParent:
      "The provided parent ID references a non-existent entity.",
    EntityInputsRequired: "No entity inputs provided.",
    InvalidEntityInputs: "Invalid entity inputs provided.",
    UndefinedEntityInput: "Unknown entity input type provided.",
  };

type EntityValidationErrorCause = {
  entityId: string;
} & (
  | {
      code: typeof entityValidationErrorCodes.NoEntityType;
    }
  | {
      code: typeof entityValidationErrorCodes.InvalidEntityType;
      entityType: string;
    }
  | {
      code: typeof entityValidationErrorCodes.InvalidParentId;
      entityParentId?: string;
    }
  | {
      code: typeof entityValidationErrorCodes.NonExistentParent;
      entityParentId?: string;
    }
  | {
      code: typeof entityValidationErrorCodes.EntityInputsRequired;
    }
  | {
      code: typeof entityValidationErrorCodes.InvalidEntityInputs;
      entityInputs?: unknown;
    }
  | {
      code: typeof entityValidationErrorCodes.UndefinedEntityInput;
      inputName: string;
    }
);

export class EntityValidationError extends Error {
  constructor(public cause: EntityValidationErrorCause) {
    super(entityValidationErrorMessages[cause.code] ?? "Unkown error");
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
    throw new EntityValidationError({
      code: entityValidationErrorCodes.InvalidEntityType,
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
    throw new EntityValidationError({
      code: entityValidationErrorCodes.UndefinedEntityInput,
      entityId: entity.id,
      inputName: inputName,
    });
  }
}

export function validateEntity<TBuilder extends BaseBuilder>(
  entity: StoreEntity<TBuilder>,
  {
    builder,
    storeData,
  }: {
    builder: TBuilder;
    storeData: StoreData<TBuilder>;
  },
): StoreEntity<TBuilder> {
  builder.entityId.validate(entity.id);

  if (typeof entity.type !== "string" || entity.type.length === 0) {
    throw new EntityValidationError({
      code: entityValidationErrorCodes.NoEntityType,
      entityId: entity.id,
    });
  }

  if (
    typeof entity.parentId !== "undefined" &&
    (typeof entity.parentId !== "string" || entity.parentId.length === 0)
  ) {
    throw new EntityValidationError({
      code: entityValidationErrorCodes.InvalidParentId,
      entityId: entity.id,
      entityParentId: entity.parentId,
    });
  }

  if (entity.parentId && !storeData.entities.has(entity.parentId)) {
    builder.entityId.validate(entity.parentId);

    throw new EntityValidationError({
      code: entityValidationErrorCodes.NonExistentParent,
      entityId: entity.id,
      entityParentId: entity.parentId,
    });
  }

  if (!entity.inputs) {
    throw new EntityValidationError({
      code: entityValidationErrorCodes.EntityInputsRequired,
      entityId: entity.id,
    });
  }

  if (typeof entity.inputs !== "object") {
    throw new EntityValidationError({
      code: entityValidationErrorCodes.InvalidEntityInputs,
      entityId: entity.id,
      entityInputs: entity.inputs,
    });
  }

  for (const inputName in entity.inputs) {
    ensureEntityInputIsDefined(entity, inputName, builder);
  }

  return {
    id: entity.id,
    type: entity.type,
    parentId: entity.parentId,
    inputs: entity.inputs,
  } satisfies Record<keyof StoreEntity<BaseBuilder>, unknown>;
}

function validateSchema<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  data: StoreData<TBuilder>,
) {
  return data.entities.forEach((entity) =>
    validateEntity(entity, { builder, storeData: data }),
  );
}

export function createStore<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  entities: Array<StoreEntity<TBuilder>>,
): Store<TBuilder> {
  const { getData, setData, subscribe } = createDataManager<
    StoreData<TBuilder>
  >({
    entities: new Map(entities.map((entity) => [entity.id, entity])),
  });

  const data = getData();

  validateSchema(builder, data);

  return {
    builder,
    getData,
    subscribe,
    addEntity(newEntity) {
      const validatedEntity = validateEntity(
        {
          ...newEntity,
          id: builder.entityId.generate(),
        },
        {
          builder,
          storeData: getData(),
        },
      );

      setData((data) => ({
        ...data,
        entities: data.entities.set(validatedEntity.id, validatedEntity),
      }));

      return validatedEntity;
    },
  };
}
