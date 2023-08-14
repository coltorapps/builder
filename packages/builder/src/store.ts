import { createBuilder, type Builder, type BuilderEntities } from "./builder";
import { createDataManager } from "./data";
import { createEntity } from "./entity";
import { createInput, type Input } from "./input";
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
  };
}[TEntities[number]["name"]];

type StoreEntity<TBuilder extends BaseBuilder> = {
  id: string;
} & BaseStoreEntity<TBuilder["entities"]>;

interface StoreData<TBuilder extends BaseBuilder> {
  entities: Map<string, StoreEntity<TBuilder>>;
}

interface Store<TBuilder extends BaseBuilder> {
  builder: TBuilder;
  getData(): StoreData<TBuilder>;
  subscribe: Subscribe<StoreData<TBuilder>>;
  addEntity(
    entity: BaseStoreEntity<TBuilder["entities"]>,
  ): StoreEntity<TBuilder>;
}

type BaseBuilder = Builder<
  BuilderEntities,
  Record<string, true | ReadonlyArray<string> | undefined>,
  ReadonlyArray<string>
>;

function validateEntity<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  entity: StoreEntity<TBuilder>,
): StoreEntity<TBuilder> {
  const hasEntityWithName = builder.entities.some(
    (builderEntity) => builderEntity.name === entity.type,
  );

  if (!hasEntityWithName) {
    throw new Error(
      `The entity '${entity.type}' is not defined in the builder.`,
    );
  }

  return { ...entity, id: builder.entityId.validate(entity.id) };
}

export function createStore<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  entities: Array<StoreEntity<TBuilder>>,
): Store<TBuilder> {
  const { getData, setData, subscribe } = createDataManager<
    StoreData<TBuilder>
  >({
    entities: new Map(
      entities.map((entity) => [entity.id, validateEntity(builder, entity)]),
    ),
  });

  return {
    builder,
    getData,
    subscribe,
    addEntity(newEntity) {
      const validatedEntity = validateEntity(builder, {
        ...newEntity,
        id: builder.entityId.generate(),
      } as StoreEntity<TBuilder>);

      setData((data) => ({
        ...data,
        entities: data.entities.set(validatedEntity.id, validatedEntity),
      }));

      return validatedEntity;
    },
  };
}

const textEntity = createEntity({
  name: "text",
  inputs: [
    createInput({
      name: "label",
      validate: (val) => val as string | undefined,
    }),
  ],
});

const selectEntity = createEntity({
  name: "select",
  inputs: [
    createInput({
      name: "title",
      validate: (val) => val as string,
    }),
    createInput({
      name: "foo",
      validate: (val) => val as number,
    }),
  ],
});

const builder = createBuilder({
  entities: [textEntity, selectEntity],
});

const store = createStore(builder, []);

const dat = store.getData().entities.get("");

if (dat?.type === "text") {
  dat.inputs?.label;
}

store.addEntity({
  type: "text",
  inputs: {},
});
