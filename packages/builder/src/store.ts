import { type Builder, type BuilderEntities } from "./builder";
import { createDataManager } from "./data";
import { type Input } from "./input";
import { type Subscribe } from "./subscription";

type UndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

type NonUndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? never : K;
}[keyof T];

type OptionalPropsIfUndefined<T> = {
  [K in UndefinedKeys<T>]?: T[K];
} & {
  [K in NonUndefinedKeys<T>]: T[K];
};

type InputsValues<TInputs extends ReadonlyArray<Input<string, unknown>>> =
  OptionalPropsIfUndefined<{
    [K in TInputs[number]["name"]]: Awaited<
      ReturnType<Extract<TInputs[number], { name: K }>["validate"]>
    >;
  }>;

type BaseStoreEntity<TEntities extends BuilderEntities> = {
  [K in TEntities[number]["name"]]: {
    type: K;
    inputs: InputsValues<Extract<TEntities[number], { name: K }>["inputs"]>;
    parentId?: string;
  };
}[TEntities[number]["name"]];

export type StoreEntity<TBuilder extends BaseBuilder> = {
  id: string;
} & BaseStoreEntity<TBuilder["entities"]>;

type NewEntity<TBuilder extends BaseBuilder> = BaseStoreEntity<
  TBuilder["entities"]
> & {
  index?: number;
};

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

type StoreValidationErrorCause =
  | "NoEntityType"
  | "InvalidEntityType"
  | "InvalidParentId"
  | "EntityInputsRequired"
  | "InvalidEntityInputs"
  | "InvalidEntityInput";

export class StoreValidationError extends Error {
  public cause: StoreValidationErrorCause;

  constructor(message: string, cause: StoreValidationErrorCause) {
    super(message);

    this.cause = cause;
  }
}

function validateEntity<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  data: StoreData<TBuilder>,
  entity: StoreEntity<TBuilder>,
): StoreEntity<TBuilder> {
  const id = builder.entityId.validate(entity.id);

  if (typeof entity.type !== "string") {
    throw new StoreValidationError(
      "Entity type was not specified.",
      "NoEntityType",
    );
  }

  const entityDefinition = builder.entities.find(
    (builderEntity) => builderEntity.name === entity.type,
  );

  if (!entityDefinition) {
    throw new StoreValidationError(
      `The entity '${entity.type}' is not defined in the builder.`,
      "InvalidEntityType",
    );
  }

  if (
    entity.parentId &&
    !data.entities.has(builder.entityId.validate(entity.parentId))
  ) {
    throw new StoreValidationError(
      `The entity with ID '${entity.id}' references a parent entity ID '${entity.parentId}' that does not exist.`,
      "InvalidParentId",
    );
  }

  if (!entity.inputs) {
    throw new StoreValidationError(
      "Entity inputs were not provided.",
      "EntityInputsRequired",
    );
  }

  if (typeof entity.inputs !== "object") {
    throw new StoreValidationError(
      "Entity inputs must be an object.",
      "InvalidEntityInputs",
    );
  }

  const entityDefinitionInputNames = entityDefinition.inputs.map(
    (input) => input.name,
  );

  for (const inputName in entity.inputs) {
    if (!entityDefinitionInputNames.includes(inputName)) {
      throw new StoreValidationError(
        `The entity with type '${entity.type}' doesn't have an input named '${inputName}'.`,
        "InvalidEntityInput",
      );
    }
  }

  return { ...entity, id };
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

  data.entities.forEach((entity) => validateEntity(builder, data, entity));

  return {
    builder,
    getData,
    subscribe,
    addEntity(newEntity) {
      const validatedEntity = validateEntity(builder, getData(), {
        ...newEntity,
        id: builder.entityId.generate(),
      });

      setData((data) => ({
        ...data,
        entities: data.entities.set(validatedEntity.id, validatedEntity),
      }));

      return validatedEntity;
    },
  };
}
