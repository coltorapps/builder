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
  inputsValidationStoreEventsNames,
  schemaStoreEventsNames,
  type Builder as BaseBuilder,
  type InputsValidationStore,
  type InputsValidationStoreEvent,
  type Schema,
  type SchemaStore,
  type SchemaStoreEvent,
} from "builder";

import {
  type EntityComponent,
  type SchemaStoreEntityForRender,
} from "./entities";

type EventsListeners<
  TBuilder extends BaseBuilder,
  TEvent extends
    | SchemaStoreEvent<TBuilder>
    | InputsValidationStoreEvent<TBuilder>,
> = {
  [K in `on${TEvent["name"]}`]?: K extends `on${infer REventName}`
    ? (payload: Extract<TEvent, { name: REventName }>["payload"]) => void
    : never;
};

export function useBuilder<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  options: {
    schema?: Schema<TBuilder>;
    events?: {
      schemaStore?: EventsListeners<TBuilder, SchemaStoreEvent<TBuilder>>;
      inputsValidationStore?: EventsListeners<
        TBuilder,
        InputsValidationStoreEvent<TBuilder>
      >;
    };
  } = {},
): {
  schemaStore: SchemaStore<TBuilder>;
  inputsValidationStore: InputsValidationStore<TBuilder>;
} {
  const schemaStoreRef = useRef(
    createSchemaStore({ builder, schema: options.schema }),
  );

  const inputsValidationStoreRef = useRef(
    createInputsValidationStore({
      schemaStore: schemaStoreRef.current,
      builder,
    }),
  );

  useEffect(() => {
    return schemaStoreRef.current.subscribe((_data, events) => {
      events.forEach((event) => {
        const listener = options.events?.schemaStore?.[`on${event.name}`] as
          | undefined
          | ((payload: SchemaStoreEvent<TBuilder>["payload"]) => void);

        listener?.(event.payload);
      });
    });
  }, [options.events?.schemaStore]);

  useEffect(() => {
    return inputsValidationStoreRef.current.subscribe((_, events) => {
      events.forEach((event) => {
        const listener = options.events?.inputsValidationStore?.[
          `on${event.name}`
        ] as
          | undefined
          | ((
              payload: InputsValidationStoreEvent<TBuilder>["payload"],
            ) => void);

        listener?.(event.payload);
      });
    });
  }, [options.events?.inputsValidationStore]);

  return {
    schemaStore: schemaStoreRef.current,
    inputsValidationStore: inputsValidationStoreRef.current,
  };
}

type EntitiesComponents<TBuilder extends BaseBuilder = BaseBuilder> = {
  [K in TBuilder["entities"][number]["name"]]: EntityComponent<
    Extract<TBuilder["entities"][number], { name: K }>
  >;
};

interface BuilderContextValue<TBuilder extends BaseBuilder = BaseBuilder> {
  schemaStore: SchemaStore<TBuilder>;
  inputsValidationStore: InputsValidationStore<TBuilder>;
  entitiesComponents: EntitiesComponents<TBuilder>;
  renderEntity: EntityRender<TBuilder>;
}

const dummyBuilder = createBuilder({ entities: [] });

const dummySchemaStore = createSchemaStore({
  builder: dummyBuilder,
});

const dummyInputsValidationStore = createInputsValidationStore({
  builder: dummyBuilder,
  schemaStore: dummySchemaStore,
});

const BuilderContext = createContext<BuilderContextValue>({
  schemaStore: dummySchemaStore,
  inputsValidationStore: dummyInputsValidationStore,
  renderEntity: (props) => props.children,
  entitiesComponents: {},
});

interface EntityRender<TBuilder extends BaseBuilder = BaseBuilder> {
  (props: {
    entity: SchemaStoreEntityForRender<TBuilder>;
    children: JSX.Element;
  }): JSX.Element;
}

const MemoizedEntity = memo(function Entity(props: {
  entityId: string;
}): ReactNode {
  const {
    schemaStore,
    inputsValidationStore,
    renderEntity,
    entitiesComponents,
  } = useContext(BuilderContext);

  const entityCache = useRef(
    schemaStore.getData().entities.get(props.entityId),
  );

  const entity = useSyncExternalStore(
    (listen) =>
      schemaStore.subscribe((data, events) => {
        const storeEntity = data.entities.get(props.entityId);

        if (!storeEntity) {
          throw new Error("Entity not found.");
        }

        if (
          events.some(
            (event) =>
              (event.name === schemaStoreEventsNames.EntityUpdated &&
                event.payload.entity.id === props.entityId) ||
              event.name === schemaStoreEventsNames.DataSet,
          )
        ) {
          entityCache.current = storeEntity;
        }

        listen();
      }),
    () => entityCache.current,
    () => entityCache.current,
  );

  const entityInputsErrorsCache = useRef(
    inputsValidationStore.getData().entitiesInputsErrors.get(props.entityId),
  );

  const entityInputsErrors = useSyncExternalStore(
    (listen) =>
      inputsValidationStore.subscribe((data, events) => {
        if (
          events.some(
            (event) =>
              (event.name ===
                inputsValidationStoreEventsNames.EntityInputErrorUpdated &&
                event.payload.entityId === props.entityId) ||
              event.name === inputsValidationStoreEventsNames.DataSet,
          )
        ) {
          entityInputsErrorsCache.current = data.entitiesInputsErrors.get(
            props.entityId,
          );
        }

        listen();
      }),
    () => entityInputsErrorsCache.current,
    () => entityInputsErrorsCache.current,
  );

  if (!entity) {
    throw new Error("Entity not found.");
  }

  const childrenIds = Array.from(entity?.children ?? []);

  const EntityComponent = entitiesComponents[entity.type];

  if (!EntityComponent) {
    throw new Error("Entity component not found.");
  }

  const entityWithId = {
    ...entity,
    id: props.entityId,
    inputsErrors: entityInputsErrors,
  };

  return renderEntity({
    entity: entityWithId,
    children: (
      <EntityComponent
        entity={entityWithId}
        onChange={() => {
          return;
        }}
      >
        {childrenIds.map((entityId) => (
          <MemoizedEntity key={entityId} entityId={entityId} />
        ))}
      </EntityComponent>
    ),
  });
});

function Entities<TBuilder extends BaseBuilder>(props: {
  schemaStore: SchemaStore<TBuilder>;
  inputsValidationStore: InputsValidationStore<TBuilder>;
  entitiesComponents: EntitiesComponents<TBuilder>;
  children?: EntityRender<TBuilder>;
}): ReactNode {
  const rootCache = useRef(Array.from(props.schemaStore.getData().root));

  const root = useSyncExternalStore(
    (listen) =>
      props.schemaStore.subscribe((data, events) => {
        if (
          events.some(
            (event) =>
              event.name === schemaStoreEventsNames.RootUpdated ||
              event.name === schemaStoreEventsNames.DataSet,
          )
        ) {
          rootCache.current = Array.from(data.root);
        }

        listen();
      }),
    () => rootCache.current,
    () => rootCache.current,
  );

  return (
    <BuilderContext.Provider
      value={{
        schemaStore: props.schemaStore,
        inputsValidationStore: props.inputsValidationStore,
        renderEntity:
          (props.children as EntityRender) ?? ((props) => props.children),
        entitiesComponents:
          props.entitiesComponents as unknown as EntitiesComponents,
      }}
    >
      {root.map((entityId) => (
        <MemoizedEntity key={entityId} entityId={entityId} />
      ))}
    </BuilderContext.Provider>
  );
}

export const Builder = {
  Entities,
};
