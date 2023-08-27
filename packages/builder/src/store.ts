import { type Builder, type BuilderEntities } from "./builder";
import { createDataManager } from "./data-manager";
import { type InputsValues } from "./input";
import { validateSchema } from "./schema-validation";
import { type Subscribe } from "./subscription-manager";
import { type OptionalPropsIfUndefined } from "./utils";

export type StoreEntity<TBuilder extends BaseBuilder> = {
  [K in TBuilder["entities"][number]["name"]]: {
    type: K;
    inputs: OptionalPropsIfUndefined<
      InputsValues<Extract<TBuilder["entities"][number], { name: K }>["inputs"]>
    >;
    parentId?: string;
  };
}[TBuilder["entities"][number]["name"]];

type EntityMutationFields = {
  index?: number;
  parentId?: StoreEntity<BaseBuilder>["parentId"];
};

type NewEntity<TBuilder extends BaseBuilder> = StoreEntity<TBuilder> &
  EntityMutationFields;

export type ComputedStoreEntity<TBuilder extends BaseBuilder> =
  StoreEntity<TBuilder> & { id: string };

export interface StoreData<TBuilder extends BaseBuilder> {
  entities: Map<string, StoreEntity<TBuilder>>;
  root: string[];
}

export interface Store<TBuilder extends BaseBuilder> {
  builder: TBuilder;
  getData(): StoreData<TBuilder>;
  subscribe: Subscribe<StoreData<TBuilder>>;
  addEntity(entity: NewEntity<TBuilder>): ComputedStoreEntity<TBuilder>;
}

export type BaseBuilder = Builder<
  BuilderEntities,
  Record<string, true | ReadonlyArray<string> | undefined>,
  ReadonlyArray<string>
>;

export interface Schema<TBuilder extends BaseBuilder> {
  entities: Record<string, StoreEntity<TBuilder>>;
  root: StoreData<TBuilder>["root"];
}

function transformStoreDataToSchema<TBuilder extends BaseBuilder>(
  storeData: StoreData<TBuilder>,
): Schema<TBuilder> {
  return {
    entities: Object.fromEntries(
      storeData.entities,
    ) as unknown as Schema<TBuilder>["entities"],
    root: storeData.root,
  };
}

export function createStore<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  schema: Schema<TBuilder>,
): Store<TBuilder> {
  const validatedSchema = validateSchema(schema, builder);

  const { getData, setData, subscribe } = createDataManager<
    StoreData<TBuilder>
  >({
    entities: new Map(Object.entries(validatedSchema.entities)),
    root: validatedSchema.root,
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

      setData((data) => {
        const newData = {
          ...data,
          entities: data.entities.set(computedEntity.id, computedEntity),
        };

        validateSchema(transformStoreDataToSchema(newData), builder);

        return newData;
      });

      return computedEntity;
    },
  };
}
