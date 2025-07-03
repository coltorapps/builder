import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import {
  createInterpreterStore,
  interpreterStoreEventsNames,
  type Builder,
  type EntitiesValues,
  type EntityValue,
  type InterpreterStore,
  type InterpreterStoreData,
  type InterpreterStoreEvent,
  type InterpreterStoreOptions,
  type Schema,
} from "@coltorapps/builder";

import {
  type EntitiesComponents,
  type EntityComponent,
  type EntityForRender,
  type GenericEntityComponent,
} from "./entities";
import { type EventsListeners } from "./utils";

export function useInterpreterStore<TBuilder extends Builder>(
  builder: TBuilder,
  schema: Schema<TBuilder>,
  options: {
    events?: EventsListeners<InterpreterStoreEvent<TBuilder>>;
  } & InterpreterStoreOptions<TBuilder> = {},
): InterpreterStore<TBuilder> {
  const interpreterStore = useMemo(
    () => createInterpreterStore(builder, schema, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

export function InterpreterEntity<TBuilder extends Builder>(props: {
  entityId: string;
  components: EntitiesComponents<TBuilder>;
  children?: GenericEntityComponent<TBuilder>;
  interpreterStore: InterpreterStore<TBuilder>;
}): JSX.Element | null {
  const entity = props.interpreterStore.schema.entities[props.entityId];

  if (!entity) {
    throw new Error(
      `[Entity] The entity with ID "${props.entityId}" was not found.`,
    );
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

  if (!entityDefinition) {
    throw new Error(
      `[Entity] The definition for the entity of type "${entity.type}" was not found.`,
    );
  }

  const EntityComponent = props.components[entity.type] as EntityComponent;

  if (!EntityComponent) {
    throw new Error(
      `[Entity] No entity component found for the entity of type "${entity.type}".`,
    );
  }

  const isUnprocessableCache = useRef(
    props.interpreterStore.isEntityProcessable(props.entityId),
  );

  const isUnprocessable = useSyncExternalStore(
    (listen) =>
      props.interpreterStore.subscribe((_data, events) => {
        if (
          events.some(
            (event) =>
              (event.name === interpreterStoreEventsNames.EntityProcessable ||
                event.name ===
                  interpreterStoreEventsNames.EntityUnprocessable) &&
              event.payload.entityId === props.entityId,
          )
        ) {
          isUnprocessableCache.current =
            props.interpreterStore.isEntityProcessable(props.entityId);

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

  const entityForRender: EntityForRender<TBuilder["entities"][number]> = {
    ...entityWithId,
    value: data.entitiesValues[props.entityId],
    error: data.entitiesErrors[props.entityId],
  };

  const renderEntity = props.children ?? ((props) => props.children);

  return renderEntity({
    entity: entityForRender,
    children: (
      <EntityComponent
        entity={entityForRender}
        setValue={(value) =>
          props.interpreterStore.setEntityValue(
            props.entityId,
            value as EntityValue<TBuilder>,
          )
        }
        validateValue={() =>
          props.interpreterStore.validateEntityValue(props.entityId)
        }
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
          <InterpreterEntity
            key={entityId}
            entityId={entityId}
            components={props.components}
            interpreterStore={props.interpreterStore}
          >
            {renderEntity}
          </InterpreterEntity>
        ))}
      </EntityComponent>
    ),
  });
}

export function InterpreterEntities<TBuilder extends Builder>(props: {
  interpreterStore: InterpreterStore<TBuilder>;
  components: EntitiesComponents<TBuilder>;
  children?: GenericEntityComponent<TBuilder>;
}): JSX.Element[] {
  return props.interpreterStore.schema.root.map((entityId) => (
    <InterpreterEntity
      key={entityId}
      entityId={entityId}
      components={props.components}
      interpreterStore={props.interpreterStore}
    >
      {props.children ?? ((props) => props.children)}
    </InterpreterEntity>
  ));
}

/**
 * @deprecated Use `InterpreterEntities` instead of `Interpreter`. The alias will be removed in future versions.
 */
export const Interpreter = InterpreterEntities;

export function useInterpreterEntitiesValues<TBuilder extends Builder>(
  interpreterStore: InterpreterStore<TBuilder>,
  entitiesIds?: Array<string>,
): EntitiesValues<TBuilder> {
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
