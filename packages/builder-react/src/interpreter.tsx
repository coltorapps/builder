import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import {
  createBuilder,
  createInterpreterStore,
  interpreterStoreEventsNames,
  type Builder,
  type EntitiesValues,
  type InterpreterStore,
  type InterpreterStoreData,
  type InterpreterStoreEvent,
  type Schema,
} from "@coltorapps/builder";

import {
  type EntitiesComponents,
  type EntityForRender,
  type GenericEntityComponent,
} from "./entities";
import { type EventsListeners } from "./utils";

export function useInterpreterStore<TBuilder extends Builder>(
  builder: TBuilder,
  schema: Schema<TBuilder>,
  options: {
    initialData?: Partial<InterpreterStoreData<TBuilder>>;
    events?: EventsListeners<InterpreterStoreEvent<TBuilder>>;
  } = {},
): InterpreterStore<TBuilder> {
  const initialData = useRef(options.initialData);

  const interpreterStore = useMemo(
    () =>
      createInterpreterStore(builder, schema, {
        initialData: initialData.current,
      }),
    [builder, schema],
  );

  useEffect(() => {
    return interpreterStore.subscribe((_data, events) => {
      events.forEach((event) => {
        const listener = options.events?.[`on${event.name}`] as
          | undefined
          | ((payload: InterpreterStoreEvent<TBuilder>["payload"]) => void);

        listener?.(event.payload);
      });
    });
  }, [interpreterStore, options.events]);

  return interpreterStore;
}

export function useInterpreterStoreData<TBuilder extends Builder>(
  interpreterStore: InterpreterStore<TBuilder>,
  shouldUpdate: (
    events: Array<InterpreterStoreEvent<TBuilder>>,
  ) => boolean = () => true,
): InterpreterStoreData<TBuilder> {
  const dataCache = useRef(interpreterStore.getData());

  return useSyncExternalStore(
    (listen) =>
      interpreterStore.subscribe((data, events) => {
        if (shouldUpdate(events)) {
          dataCache.current = data;

          listen();
        }
      }),
    () => dataCache.current,
    () => dataCache.current,
  );
}

const MemoizedEntity = memo(function Entity(props: {
  entityId: string;
}): JSX.Element | null {
  const { interpreterStore, components, renderEntity } =
    useContext(InterpreterContext);

  const entity = interpreterStore.schema.entities[props.entityId];

  if (!entity) {
    throw new Error(
      `[Entity] The entity with ID "${props.entityId}" was not found.`,
    );
  }

  const data = useInterpreterStoreData(interpreterStore, (events) =>
    events.some(
      (event) =>
        (event.name === interpreterStoreEventsNames.EntityValueUpdated &&
          event.payload.entityId === props.entityId) ||
        (event.name === interpreterStoreEventsNames.EntityErrorUpdated &&
          event.payload.entityId === props.entityId) ||
        event.name === interpreterStoreEventsNames.DataSet,
    ),
  );

  const entityDefinition = interpreterStore.builder.entities.find(
    (item) => item.name === entity.type,
  );

  const entityWithId = {
    ...entity,
    id: props.entityId,
  };

  if (!entityDefinition) {
    throw new Error(
      `[Entity] The definition for the entity of type "${entity.type}" was not found.`,
    );
  }

  const EntityComponent = components[entity.type];

  if (!EntityComponent) {
    throw new Error(
      `[Entity] No entity component found for the entity of type "${entity.type}".`,
    );
  }

  const isUnprocessableCache = useRef(
    interpreterStore.isEntityProcessable(props.entityId),
  );

  const isUnprocessable = useSyncExternalStore(
    (listen) =>
      interpreterStore.subscribe((_data, events) => {
        if (
          events.some(
            (event) =>
              (event.name === interpreterStoreEventsNames.EntityProcessable ||
                event.name ===
                  interpreterStoreEventsNames.EntityUnprocessable) &&
              event.payload.entityId === props.entityId,
          )
        ) {
          isUnprocessableCache.current = interpreterStore.isEntityProcessable(
            props.entityId,
          );

          listen();
        }
      }),
    () => isUnprocessableCache.current,
    () => isUnprocessableCache.current,
  );

  if (!isUnprocessable) {
    return null;
  }

  const childrenIds = entity?.children ?? [];

  const entityForRender: EntityForRender = {
    ...entityWithId,
    value: data.entitiesValues[props.entityId],
    error: data.entitiesErrors[props.entityId],
  };

  return renderEntity({
    entity: entityForRender,
    children: (
      <EntityComponent
        entity={entityForRender}
        setValue={(value) =>
          interpreterStore.setEntityValue(props.entityId, value)
        }
        validateValue={() =>
          interpreterStore.validateEntityValue(props.entityId)
        }
        resetError={() => interpreterStore.resetEntityError(props.entityId)}
        resetValue={() => interpreterStore.resetEntityValue(props.entityId)}
        clearValue={() => interpreterStore.clearEntityValue(props.entityId)}
      >
        {childrenIds.map((entityId) => (
          <MemoizedEntity key={entityId} entityId={entityId} />
        ))}
      </EntityComponent>
    ),
  });
});

const InterpreterContext = createContext<{
  interpreterStore: InterpreterStore;
  components: EntitiesComponents;
  renderEntity: GenericEntityComponent;
}>({
  interpreterStore: createInterpreterStore(createBuilder({ entities: [] }), {
    entities: {},
    root: [],
  }),
  components: {},
  renderEntity: ({ children }) => children,
});

export function Interpreter<TBuilder extends Builder>(props: {
  interpreterStore: InterpreterStore<TBuilder>;
  components: EntitiesComponents<TBuilder>;
  children?: GenericEntityComponent<TBuilder>;
}): JSX.Element {
  return (
    <InterpreterContext.Provider
      value={{
        interpreterStore: props.interpreterStore,
        renderEntity:
          (props.children as GenericEntityComponent) ??
          ((props) => props.children),
        components: props.components as unknown as EntitiesComponents,
      }}
    >
      {props.interpreterStore.schema.root.map((entityId) => (
        <MemoizedEntity key={entityId} entityId={entityId} />
      ))}
    </InterpreterContext.Provider>
  );
}

export function useEntitiesValues(entitiesIds?: Array<string>): EntitiesValues {
  const { interpreterStore } = useContext(InterpreterContext);

  const { entitiesValues } = useInterpreterStoreData(
    interpreterStore,
    (events) =>
      events.some(
        (event) =>
          event.name === interpreterStoreEventsNames.DataSet ||
          (event.name === interpreterStoreEventsNames.EntityValueUpdated &&
            entitiesIds &&
            entitiesIds.includes(event.payload.entityId)) ||
          (event.name === interpreterStoreEventsNames.EntityValueUpdated &&
            !entitiesIds),
      ),
  );

  if (!entitiesIds) {
    return entitiesValues;
  }

  return entitiesIds.reduce<EntitiesValues>((result, entityId) => {
    result[entityId] = entitiesValues[entityId];

    return result;
  }, {});
}
