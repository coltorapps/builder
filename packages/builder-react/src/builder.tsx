import {
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createBuilder,
  createStore,
  storeEventsNames,
  type Builder as BaseBuilder,
  type Schema,
  type Store,
  type StoreEntityWithId,
  type StoreEvent,
} from "builder";

import { arraysAreEqual } from "./utils";

export function useBuilder<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  options: {
    schema?: Schema<TBuilder>;
    onEntityAdded?: (
      event: Extract<
        StoreEvent<TBuilder>,
        { name: typeof storeEventsNames.EntityAdded }
      >["payload"],
    ) => void;
    onEntityUpdated?: (
      event: Extract<
        StoreEvent<TBuilder>,
        { name: typeof storeEventsNames.EntityUpdated }
      >["payload"],
    ) => void;
    onEntityDeleted?: (
      event: Extract<
        StoreEvent<TBuilder>,
        { name: typeof storeEventsNames.EntityDeleted }
      >["payload"],
    ) => void;
  } = {},
): { store: Store<TBuilder> } {
  const storeRef = useRef(createStore(builder, options));

  const { onEntityAdded, onEntityDeleted, onEntityUpdated } = options;

  useEffect(() => {
    return storeRef.current.subscribeToEvents((event) => {
      switch (event.name) {
        case storeEventsNames.EntityAdded: {
          onEntityAdded?.(event.payload);

          return;
        }
        case storeEventsNames.EntityUpdated: {
          onEntityUpdated?.(event.payload);

          return;
        }
        case storeEventsNames.EntityDeleted: {
          onEntityDeleted?.(event.payload);

          return;
        }
        default: {
          break;
        }
      }
    });
  }, [onEntityAdded, onEntityDeleted, onEntityUpdated]);

  return {
    store: storeRef.current,
  };
}

interface BuilderContextValue<TBuilder extends BaseBuilder = BaseBuilder> {
  store: Store<TBuilder>;
  renderEntity: EntityRender<TBuilder>;
}

const BuilderContext = createContext<BuilderContextValue>({
  store: createStore(createBuilder({ entities: [] })),
  renderEntity: (props) => props.children,
});

interface EntityRender<TBuilder extends BaseBuilder = BaseBuilder> {
  (props: {
    entity: StoreEntityWithId<TBuilder>;
    children: ReactNode;
  }): ReactNode;
}

const MemoizedEntity = memo(function Entity(props: {
  entityId: string;
}): ReactNode {
  const { store } = useContext(BuilderContext);

  const entityCache = useRef(
    store.getData().schema.entities.get(props.entityId),
  );

  if (!entityCache.current) {
    throw new Error("Entity not found.");
  }

  const entity = useSyncExternalStore(
    (listen) =>
      store.subscribe((data) => {
        const storeEntity = data.schema.entities.get(props.entityId);

        if (!storeEntity) {
          throw new Error("Entity not found.");
        }

        if (
          storeEntity.updatedAt?.getTime() ===
          entityCache.current?.updatedAt?.getTime()
        ) {
          entityCache.current = storeEntity;
        }

        listen();
      }),
    () => entityCache.current,
    () => entityCache.current,
  );

  const childrenIds = Array.from(entity?.children ?? []);

  return (
    <div>
      {props.entityId}
      {childrenIds ? (
        <div style={{ marginLeft: "1rem" }}>
          <Entities entitiesIds={childrenIds} />
        </div>
      ) : null}
    </div>
  );
});

function Entities(props: { entitiesIds: string[] }): ReactNode {
  return props.entitiesIds.map((entityId) => (
    <MemoizedEntity key={entityId} entityId={entityId} />
  ));
}

export function Builder<TBuilder extends BaseBuilder>(props: {
  store: Store<TBuilder>;
  children?: EntityRender<TBuilder>;
}): ReactNode {
  const rootCache = useRef(Array.from(props.store.getData().schema.root));

  const root = useSyncExternalStore(
    (listen) =>
      props.store.subscribe((data) => {
        const rootEntities = Array.from(data.schema.root);

        if (!arraysAreEqual(Array.from(rootEntities), rootCache.current)) {
          rootCache.current = rootEntities;
        }

        listen();
      }),
    () => rootCache.current,
    () => rootCache.current,
  );

  return (
    <BuilderContext.Provider
      value={{
        store: props.store,
        renderEntity:
          (props.children as EntityRender) ?? ((props) => props.children),
      }}
    >
      <Entities entitiesIds={root} />
    </BuilderContext.Provider>
  );
}
