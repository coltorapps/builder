import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import {
  builderStoreEventsNames,
  createBuilder,
  createBuilderStore,
  type Builder,
  type BuilderStore,
  type BuilderStoreData,
  type BuilderStoreEvent,
} from "@coltorapps/builder";

import { type EntitiesAttributesComponents } from "./attributes";
import {
  type EntitiesComponents,
  type EntityComponent,
  type EntityForRender,
  type GenericEntityComponent,
} from "./entities";
import { type EventsListeners } from "./utils";

export function useBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options: {
    initialData?: Partial<BuilderStoreData<TBuilder>>;
    events?: EventsListeners<BuilderStoreEvent<TBuilder>>;
  } = {},
): BuilderStore<TBuilder> {
  const builderStore = useMemo(
    () =>
      createBuilderStore(builder, {
        initialData: options.initialData,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [builder],
  );

  useEffect(() => {
    return builderStore.subscribe((_data, events) => {
      events.forEach((event) => {
        const listener = options.events?.[`on${event.name}`] as
          | undefined
          | ((payload: BuilderStoreEvent<TBuilder>["payload"]) => void);

        listener?.(event.payload);
      });
    });
  }, [builderStore, options.events]);

  return builderStore;
}

export function useBuilderStoreData<TBuilder extends Builder>(
  builderStore: BuilderStore<TBuilder>,
  shouldUpdate: (events: Array<BuilderStoreEvent<TBuilder>>) => boolean = () =>
    true,
): BuilderStoreData<TBuilder> {
  const dataCache = useRef(builderStore.getData());

  return useSyncExternalStore(
    (listen) =>
      builderStore.subscribe((data, events) => {
        if (shouldUpdate(events)) {
          dataCache.current = data;

          listen();
        }
      }),
    () => dataCache.current,
    () => dataCache.current,
  );
}

export function BuilderEntity<TBuilder extends Builder>(props: {
  entityId: string;
  components: EntitiesComponents<TBuilder>;
  children?: GenericEntityComponent<TBuilder>;
  builderStore: BuilderStore<TBuilder>;
}): JSX.Element | null {
  const data = useBuilderStoreData(props.builderStore, (events) =>
    events.some(
      (event) =>
        (event.name === builderStoreEventsNames.EntityUpdated &&
          event.payload.entity.id === props.entityId) ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  const entity = data.schema.entities[props.entityId];

  if (!entity) {
    throw new Error(
      `[Entity] The entity with ID "${props.entityId}" was not found.`,
    );
  }

  const childrenIds = entity?.children ?? [];

  const EntityComponent = props.components[entity.type] as EntityComponent;

  if (!EntityComponent) {
    throw new Error(
      `[Entity] No entity component found for the entity of type "${entity.type}".`,
    );
  }

  const entityForRender: EntityForRender<TBuilder["entities"][number]> = {
    ...entity,
    id: props.entityId,
  };

  const renderEntity = props.children ?? ((props) => props.children);

  return renderEntity({
    entity: entityForRender,
    children: (
      <EntityComponent
        entity={entityForRender}
        setValue={() => {
          return;
        }}
        resetError={() => {
          return;
        }}
        resetValue={() => {
          return;
        }}
        clearValue={() => {
          return;
        }}
        validateValue={() => {
          return new Promise((resolve) => resolve());
        }}
      >
        {childrenIds.map((entityId) => (
          <BuilderEntity
            key={entityId}
            entityId={entityId}
            components={props.components}
            builderStore={props.builderStore}
          />
        ))}
      </EntityComponent>
    ),
  });
}

export function BuilderEntities<TBuilder extends Builder>(props: {
  builderStore: BuilderStore<TBuilder>;
  components: EntitiesComponents<TBuilder>;
  children?: GenericEntityComponent<TBuilder>;
}): JSX.Element[] {
  const data = useBuilderStoreData(props.builderStore, (events) =>
    events.some(
      (event) =>
        event.name === builderStoreEventsNames.RootUpdated ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  return data.schema.root.map((entityId) => (
    <BuilderEntity
      key={entityId}
      entityId={entityId}
      components={props.components}
      builderStore={props.builderStore}
    >
      {props.children ?? ((props) => props.children)}
    </BuilderEntity>
  ));
}

export const BuilderAttributesContext = createContext<{
  builderStore: BuilderStore;
  entityId: string;
}>({
  builderStore: createBuilderStore(createBuilder({ entities: [] })),
  entityId: "",
});

export function BuilderEntityAttributes<TBuilder extends Builder>(props: {
  builderStore: BuilderStore<TBuilder>;
  entityId: string;
  components: EntitiesAttributesComponents<TBuilder>;
}): JSX.Element {
  const data = useBuilderStoreData(props.builderStore, (events) =>
    events.some(
      (event) =>
        event.name === builderStoreEventsNames.EntityAdded ||
        event.name === builderStoreEventsNames.EntityCloned ||
        event.name === builderStoreEventsNames.EntityDeleted ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  const entity = data.schema.entities[props.entityId];

  if (!entity) {
    throw new Error(
      `[Attributes] The entity with ID "${props.entityId}" was not found.`,
    );
  }

  return (
    <BuilderAttributesContext.Provider
      value={{
        builderStore: props.builderStore,
        entityId: props.entityId,
      }}
    >
      {props.components[entity.type]({})}
    </BuilderAttributesContext.Provider>
  );
}
