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
  createInputsValidationStore,
  createSchemaStore,
  schemaStoreEventsNames,
  type Builder as BaseBuilder,
  type InputsValidationStore,
  type Schema,
  type SchemaStore,
  type SchemaStoreEntityWithId,
  type SchemaStoreEvent,
} from "builder";

import { arraysAreEqual } from "./utils";

export function useBuilder<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  options: {
    schema?: Schema<TBuilder>;
    onEntityAdded?: (
      event: Extract<
        SchemaStoreEvent<TBuilder>,
        { name: typeof schemaStoreEventsNames.EntityAdded }
      >["payload"],
    ) => void;
    onEntityUpdated?: (
      event: Extract<
        SchemaStoreEvent<TBuilder>,
        { name: typeof schemaStoreEventsNames.EntityUpdated }
      >["payload"],
    ) => void;
    onEntityDeleted?: (
      event: Extract<
        SchemaStoreEvent<TBuilder>,
        { name: typeof schemaStoreEventsNames.EntityDeleted }
      >["payload"],
    ) => void;
  } = {},
): {
  schemaStore: SchemaStore<TBuilder>;
  inputsValidationStore: InputsValidationStore<TBuilder>;
} {
  const schemaStoreRef = useRef(
    createSchemaStore({ builder, schema: options.schema }),
  );

  const inputsValidationStoreRef = useRef(
    createInputsValidationStore({ schemaStore: schemaStoreRef.current }),
  );

  const { onEntityAdded, onEntityDeleted, onEntityUpdated } = options;

  useEffect(() => {
    return schemaStoreRef.current.subscribeToEvents((event) => {
      switch (event.name) {
        case schemaStoreEventsNames.EntityAdded: {
          onEntityAdded?.(event.payload);

          return;
        }
        case schemaStoreEventsNames.EntityUpdated: {
          onEntityUpdated?.(event.payload);

          return;
        }
        case schemaStoreEventsNames.EntityDeleted: {
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
    schemaStore: schemaStoreRef.current,
    inputsValidationStore: inputsValidationStoreRef.current,
  };
}

interface BuilderContextValue<TBuilder extends BaseBuilder = BaseBuilder> {
  store: SchemaStore<TBuilder>;
  renderEntity: EntityRender<TBuilder>;
}

const BuilderContext = createContext<BuilderContextValue>({
  store: createSchemaStore({ builder: createBuilder({ entities: [] }) }),
  renderEntity: (props) => props.children,
});

interface EntityRender<TBuilder extends BaseBuilder = BaseBuilder> {
  (props: {
    entity: SchemaStoreEntityWithId<TBuilder>;
    children: JSX.Element;
  }): JSX.Element;
}

const MemoizedEntity = memo(function Entity(props: {
  entityId: string;
}): ReactNode {
  const { store, renderEntity } = useContext(BuilderContext);

  const entityCache = useRef(store.getData().entities.get(props.entityId));

  const entity = useSyncExternalStore(
    (listen) =>
      store.subscribe((data) => {
        const storeEntity = data.entities.get(props.entityId);

        if (!storeEntity) {
          throw new Error("Entity not found.");
        }

        if (
          storeEntity.updatedAt?.getTime() !==
          entityCache.current?.updatedAt?.getTime()
        ) {
          entityCache.current = storeEntity;
        }

        listen();
      }),
    () => entityCache.current,
    () => entityCache.current,
  );

  if (!entity) {
    throw new Error("Entity not found.");
  }

  const childrenIds = Array.from(entity?.children ?? []);

  return renderEntity({
    entity: { ...entity, id: props.entityId },
    children: <Entities entitiesIds={childrenIds} />,
  });
});

function Entities(props: { entitiesIds: string[] }): ReactNode {
  return props.entitiesIds.map((entityId) => (
    <MemoizedEntity key={entityId} entityId={entityId} />
  ));
}

export function Builder<TBuilder extends BaseBuilder>(props: {
  client: {
    schemaStore: SchemaStore<TBuilder>;
    inputsValidationStore: InputsValidationStore<TBuilder>;
  };
  children?: EntityRender<TBuilder>;
}): ReactNode {
  const rootCache = useRef(Array.from(props.client.schemaStore.getData().root));

  const root = useSyncExternalStore(
    (listen) =>
      props.client.schemaStore.subscribe((data) => {
        const rootEntities = Array.from(data.root);

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
        store: props.client.schemaStore,
        renderEntity:
          (props.children as EntityRender) ?? ((props) => props.children),
      }}
    >
      <Entities entitiesIds={root} />
    </BuilderContext.Provider>
  );
}
