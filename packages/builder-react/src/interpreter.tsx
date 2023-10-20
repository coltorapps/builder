import {
  createContext,
  memo,
  useContext,
  useEffect,
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
} from "builder";

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
  const interpreterStoreRef = useRef(
    createInterpreterStore({
      builder,
      schema,
      initialData: {
        entitiesValues: options.initialData?.entitiesValues,
        entitiesErrors: options.initialData?.entitiesErrors,
      },
    }),
  );

  useEffect(() => {
    return interpreterStoreRef.current.subscribe((_data, events) => {
      events.forEach((event) => {
        const listener = options.events?.[`on${event.name}`] as
          | undefined
          | ((payload: InterpreterStoreEvent<TBuilder>["payload"]) => void);

        listener?.(event.payload);
      });
    });
  }, [options.events]);

  return interpreterStoreRef.current;
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
  entitiesComponents: EntitiesComponents;
  renderEntity: GenericEntityComponent;
  interpreterStore: InterpreterStore;
}): JSX.Element | null {
  const entity = props.interpreterStore.schema.entities[props.entityId];

  if (!entity) {
    throw new Error("Entity not found.");
  }

  const data = useInterpreterStoreData(props.interpreterStore, (events) =>
    events.some(
      (event) =>
        (event.name === interpreterStoreEventsNames.EntityValueUpdated &&
          event.payload.entityId === props.entityId) ||
        (event.name === interpreterStoreEventsNames.EntityErrorUpdated &&
          event.payload.entityId === props.entityId) ||
        event.name === interpreterStoreEventsNames.DataSet,
    ),
  );

  const entityDefinition = props.interpreterStore.builder.entities.find(
    (item) => item.name === entity.type,
  );

  const entityWithId = {
    ...entity,
    id: props.entityId,
  };

  const shouldBeProcessedCache = useRef(
    entityDefinition?.shouldBeProcessed({
      entity: entityWithId,
      entitiesValues: data.entitiesValues,
    }) ?? true,
  );

  const shouldBeProcessed = useSyncExternalStore(
    (listen) =>
      props.interpreterStore.subscribe((data) => {
        shouldBeProcessedCache.current =
          entityDefinition?.shouldBeProcessed({
            entity: entityWithId,
            entitiesValues: data.entitiesValues,
          }) ?? true;

        listen();
      }),
    () => shouldBeProcessedCache.current,
    () => shouldBeProcessedCache.current,
  );

  if (!shouldBeProcessed) {
    return null;
  }

  if (!entityDefinition) {
    throw new Error("Entity definition not found.");
  }

  const childrenIds = entity?.children ?? [];

  const EntityComponent = props.entitiesComponents[entity.type];

  if (!EntityComponent) {
    throw new Error("Entity component not found.");
  }

  const entityForRender: EntityForRender = {
    ...entityWithId,
    value: data.entitiesValues[props.entityId],
    error: data.entitiesErrors[props.entityId],
  };

  return props.renderEntity({
    entity: entityForRender,
    children: (
      <EntityComponent
        entity={entityForRender}
        setValue={(value) =>
          props.interpreterStore.setEntityValue(props.entityId, value)
        }
        validate={() => props.interpreterStore.validateEntity(props.entityId)}
        resetError={() =>
          props.interpreterStore.resetEntityError(props.entityId)
        }
        resetValue={() =>
          props.interpreterStore.resetEntityValue(props.entityId)
        }
        clearValue={() =>
          props.interpreterStore.clearEntityValue(props.entityId)
        }
      >
        {childrenIds.map((entityId) => (
          <MemoizedEntity key={entityId} {...props} />
        ))}
      </EntityComponent>
    ),
  });
});

const InterpreterContext = createContext<{
  interpreterStore: InterpreterStore;
}>({
  interpreterStore: createInterpreterStore({
    builder: createBuilder({ entities: [] }),
    schema: {
      entities: {},
      root: [],
    },
  }),
});

export function Interpreter<TBuilder extends Builder>(props: {
  interpreterStore: InterpreterStore<TBuilder>;
  entitiesComponents: EntitiesComponents<TBuilder>;
  children?: GenericEntityComponent<TBuilder>;
}): JSX.Element {
  const renderEntity =
    (props.children as GenericEntityComponent) ?? ((props) => props.children);

  return (
    <InterpreterContext.Provider
      value={{
        interpreterStore: props.interpreterStore,
      }}
    >
      {props.interpreterStore.schema.root.map((entityId) => (
        <MemoizedEntity
          key={entityId}
          entityId={entityId}
          renderEntity={renderEntity}
          interpreterStore={props.interpreterStore}
          entitiesComponents={
            props.entitiesComponents as unknown as EntitiesComponents
          }
        />
      ))}
    </InterpreterContext.Provider>
  );
}

export function useEntitiesValues(entitiesIds?: Array<string>): EntitiesValues {
  const { interpreterStore } = useContext(InterpreterContext);

  const entitiesValues = useInterpreterStoreData(interpreterStore, (events) =>
    events.some(
      (event) =>
        event.name === interpreterStoreEventsNames.DataSet ||
        (event.name === interpreterStoreEventsNames.EntityValueUpdated &&
          entitiesIds &&
          entitiesIds.includes(event.payload.entityId)) ||
        (event.name === interpreterStoreEventsNames.EntityValueUpdated &&
          !entitiesIds),
    ),
  ).entitiesValues;

  if (!entitiesIds) {
    return entitiesValues;
  }

  return entitiesIds.reduce<EntitiesValues>((result, entityId) => {
    result[entityId] = entitiesValues[entityId];

    return result;
  }, {});
}
