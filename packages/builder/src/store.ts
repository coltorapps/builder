import { type Builder } from "./builder";
import { createDataManager } from "./data-manager";
import {
  ensureEntityCanLackParent,
  ensureEntityChildAllowed,
  ensureEntityExists,
  ensureEntityParentIdHasValidReference,
  getEmptySchema,
  type Schema,
  type SchemaEntity,
} from "./schema";
import { type Subscribe } from "./subscription-manager";

type EntityMutationFields = {
  index?: number;
  parentId?: string;
};

type NewEntity<TBuilder extends Builder> = SchemaEntity<TBuilder> &
  EntityMutationFields;

export interface StoreData<TBuilder extends Builder> {
  entities: Map<string, SchemaEntity<TBuilder>>;
  root: Set<string>;
}

export interface Store<TBuilder extends Builder> {
  builder: TBuilder;
  getData(): StoreData<TBuilder>;
  subscribe: Subscribe<StoreData<TBuilder>>;
  addEntity(entity: NewEntity<TBuilder>): void;
  deleteEntity(id: string): void;
  getSchema(): Schema<TBuilder>;
}

function transformStoreDataToSchema<TBuilder extends Builder>(
  data: StoreData<TBuilder>,
): Schema<TBuilder> {
  return {
    root: Array.from(data.root),
    entities: Object.fromEntries(data.entities),
  };
}

export function createStore<TBuilder extends Builder>(
  builder: TBuilder,
  schema?: Schema<TBuilder>,
): Store<TBuilder> {
  const computedSchema = schema ?? getEmptySchema<TBuilder>();

  const { getData, setData, subscribe } = createDataManager<
    StoreData<TBuilder>
  >({
    entities: new Map(Object.entries(computedSchema.entities)),
    root: new Set(computedSchema.root),
  });

  return {
    builder,
    getData,
    subscribe,
    getSchema() {
      return transformStoreDataToSchema(getData());
    },
    addEntity(newEntity) {
      setData((data) => {
        const id = builder.entityId.generate();

        const entityWithId = { ...newEntity, id };

        const parentEntity = ensureEntityParentIdHasValidReference(
          entityWithId,
          Object.fromEntries(data.entities),
        );

        if (parentEntity) {
          ensureEntityChildAllowed(parentEntity, entityWithId, builder);
        } else {
          ensureEntityCanLackParent(entityWithId, builder);
        }

        return {
          root: newEntity.parentId ? data.root : new Set(data.root).add(id),
          entities: new Map(data.entities).set(id, newEntity),
        };
      });
    },
    deleteEntity(id) {
      setData((data) => {
        const newRoot = new Set(data.root);

        newRoot.delete(id);

        const newEntities = new Map(data.entities);

        const entitiesSchema = Object.fromEntries(newEntities);

        function deleteEntity(id: string) {
          const entity = ensureEntityExists(id, entitiesSchema);

          entity.children?.forEach((childId) => deleteEntity(childId));

          newEntities.delete(entity.id);
        }

        deleteEntity(id);

        return {
          root: newRoot,
          entities: newEntities,
        };
      });
    },
  };
}
