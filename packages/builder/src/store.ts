import { type Builder, type BuilderEntities } from "./builder";
import { createDataManager } from "./data";
import { type InputsValues } from "./input";
import { type Subscribe } from "./subscription";
import { type OptionalPropsIfUndefined } from "./utils";

type BaseStoreEntity<TEntities extends BuilderEntities> = {
  [K in TEntities[number]["name"]]: {
    type: K;
    inputs: OptionalPropsIfUndefined<
      InputsValues<Extract<TEntities[number], { name: K }>["inputs"]>
    >;
    parentId?: string;
    value?: Awaited<
      ReturnType<Extract<TEntities[number], { name: K }>["validate"]>
    >;
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

const entityValidationErrorCauses = {
  NoEntityType: "NoEntityType",
  InvalidEntityType: "InvalidEntityType",
  InvalidParentId: "InvalidParentId",
  EntityInputsRequired: "EntityInputsRequired",
  InvalidEntityInputs: "InvalidEntityInputs",
  InvalidEntityInput: "InvalidEntityInput",
} as const;

export type EntityValidationErrorCause =
  (typeof entityValidationErrorCauses)[keyof typeof entityValidationErrorCauses];

export class EntityValidationError extends Error {
  public cause: EntityValidationErrorCause;

  constructor(message: string, cause: EntityValidationErrorCause) {
    super(message);

    this.cause = cause;
  }
}

function getEntityDefinition<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  entityName: TBuilder["entities"][number]["name"],
): TBuilder["entities"][number] {
  const entityDefinition = builder.entities.find(
    (builderEntity) => builderEntity.name === entityName,
  );

  if (!entityDefinition) {
    throw new EntityValidationError(
      `The entity '${entityName}' is not defined in the builder.`,
      entityValidationErrorCauses.InvalidEntityType,
    );
  }

  return entityDefinition;
}

export function validateStoreEntity<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  data: StoreData<TBuilder>,
  storeEntity: StoreEntity<TBuilder>,
): StoreEntity<TBuilder> {
  const id = builder.entityId.validate(storeEntity.id);

  if (typeof storeEntity.type !== "string") {
    throw new EntityValidationError(
      "Entity type is not specified.",
      entityValidationErrorCauses.NoEntityType,
    );
  }

  const entityDefinition = getEntityDefinition(builder, storeEntity.type);

  if (
    storeEntity.parentId &&
    !data.entities.has(builder.entityId.validate(storeEntity.parentId))
  ) {
    throw new EntityValidationError(
      `The entity with ID '${storeEntity.id}' references a parent entity ID '${storeEntity.parentId}' that does not exist.`,
      entityValidationErrorCauses.InvalidParentId,
    );
  }

  if (!storeEntity.inputs) {
    throw new EntityValidationError(
      "Entity inputs are not provided.",
      entityValidationErrorCauses.EntityInputsRequired,
    );
  }

  if (typeof storeEntity.inputs !== "object") {
    throw new EntityValidationError(
      "Entity inputs must be an object.",
      entityValidationErrorCauses.InvalidEntityInputs,
    );
  }

  const entityDefinitionInputNames = new Set(
    entityDefinition.inputs.map((input) => input.name),
  );

  for (const inputName in storeEntity.inputs) {
    if (
      storeEntity.inputs.hasOwnProperty(inputName) &&
      !entityDefinitionInputNames.has(inputName)
    ) {
      throw new EntityValidationError(
        `The entity with type '${storeEntity.type}' doesn't have an input named '${inputName}'.`,
        entityValidationErrorCauses.InvalidEntityInput,
      );
    }
  }

  return {
    id,
    type: storeEntity.type,
    parentId: storeEntity.parentId,
    inputs: storeEntity.inputs,
    value: storeEntity.value,
  };
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

  data.entities.forEach((storeEntity) =>
    validateStoreEntity(builder, data, storeEntity),
  );

  return {
    builder,
    getData,
    subscribe,
    addEntity(newEntity) {
      const validatedEntity = validateStoreEntity(builder, getData(), {
        ...newEntity,
        id: builder.entityId.generate(),
        value:
          newEntity.value ??
          getEntityDefinition(builder, newEntity.type).defaultValue(newEntity),
      });

      setData((data) => ({
        ...data,
        entities: data.entities.set(validatedEntity.id, validatedEntity),
      }));

      return validatedEntity;
    },
  };
}
