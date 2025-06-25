import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  createInterpreterStore,
  type Builder,
  type Entity,
  type EntityValue,
  type EntityValueValidationResult,
  type InterpreterStore,
  type InterpreterStoreData,
  type InterpreterStoreEvent,
  type InterpreterStoreOptions,
  type Schema,
  type SchemaEntityWithId,
} from "@coltorapps/builder";

import { chainRenderers, shallow, type EventsListeners } from "./utils";

export interface InterpreterEntityInstance<TEntity extends Entity = Entity>
  extends Pick<
    SchemaEntityWithId<TEntity>,
    "id" | "parentId" | "children" | "type" | "attributes"
  > {
  getValue(): EntityValue<TEntity> | undefined;
  setValue(value: EntityValue<TEntity>): void;
  getError(): unknown;
  setError(value: unknown): void;
  validate(): Promise<EntityValueValidationResult<TEntity>>;
  subscribeToValue(
    listener: (value: EntityValue<TEntity> | undefined) => void,
  ): () => void;
  subscribeToError(listener: (error: unknown) => void): () => void;
}

export interface InterpreterEntityComponentProps<
  TEntity extends TBuilder["entities"][string],
  TBuilder extends Builder = Builder,
> {
  entity: InterpreterEntityInstance<TEntity>;
  RenderChildren(props: {
    children?: GenericInterpreterEntityComponent<TBuilder>;
  }): ReactNode;
  RenderChild(props: {
    entityId: string;
    children?: GenericInterpreterEntityComponent<TBuilder>;
  }): ReactNode;
}

export type InterpreterEntityComponent<
  TEntity extends TBuilder["entities"][string],
  TBuilder extends Builder = Builder,
> = (props: InterpreterEntityComponentProps<TEntity, TBuilder>) => ReactNode;

export type InterpreterEntitiesComponents<TBuilder extends Builder = Builder> =
  {
    [K in Extract<
      keyof TBuilder["entities"],
      string
    >]: InterpreterEntityComponent<TBuilder["entities"][K], TBuilder>;
  };

export type GenericInterpreterEntityComponent<
  TBuilder extends Builder = Builder,
> = (props: {
  entity: InterpreterEntityInstance<TBuilder["entities"][string]>;
  children?: ReactNode;
}) => ReactNode;

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

export function useInterpreterStoreData<TBuilder extends Builder, TData>(
  interpreterStore: InterpreterStore<TBuilder>,
  selector: (
    data: InterpreterStoreData<TBuilder>,
    events: Array<InterpreterStoreEvent<TBuilder>>,
  ) => TData = (data) => data as TData,
  comparator: (
    oldData: TData,
    newData: TData,
    events: Array<InterpreterStoreEvent<TBuilder>>,
  ) => boolean = shallow,
): TData {
  const dataCache = useRef(selector(interpreterStore.getData(), []));

  return useSyncExternalStore(
    (listen) =>
      interpreterStore.subscribe((data, events) => {
        const newData = selector(data, events);

        if (comparator(dataCache.current, newData, events)) {
          dataCache.current = newData;

          listen();
        }
      }),
    () => dataCache.current,
    () => dataCache.current,
  );
}

export function InterpreterEntity<TBuilder extends Builder>(props: {
  entityId: string;
  components: InterpreterEntitiesComponents<TBuilder>;
  children?: GenericInterpreterEntityComponent<TBuilder>;
  interpreterStore: InterpreterStore<TBuilder>;
}): ReactNode {
  const entity = props.interpreterStore.schema.entities[props.entityId];

  if (!entity) {
    throw new Error(
      `<InterpreterEntity /> encountered an error:

Attempted to render an entity with ID "${props.entityId}", but it does not exist in the provided interpreter store's schema.`,
    );
  }

  const entityDefinition = props.interpreterStore.builder.entities[entity.type];

  if (!entityDefinition) {
    throw new Error(
      `<InterpreterEntity /> encountered an error:

Attempted to render an entity of type "${entity.type}", but this type is not registered in the builder definition used to create the provided interpreter store.

Ensure that the builder definition includes an entity of type "${entity.type}".`,
    );
  }

  const entityForRender: InterpreterEntityInstance<
    TBuilder["entities"][string]
  > = {
    ...entity,
    id: props.entityId,
    getValue() {
      return props.interpreterStore.getEntityValue(props.entityId);
    },
    setValue(value) {
      return props.interpreterStore.setEntityValue(props.entityId, value);
    },
    getError() {
      return props.interpreterStore.getEntityError(props.entityId);
    },
    setError(error) {
      return props.interpreterStore.setEntityError(props.entityId, error);
    },
    validate() {
      return props.interpreterStore.validateEntityValue(
        props.entityId,
      ) as ReturnType<
        InterpreterEntityInstance<TBuilder["entities"][string]>["validate"]
      >;
    },
    subscribeToValue(listener) {
      return props.interpreterStore.subscribe((data, events) => {
        if (
          events.some(
            (event) =>
              (event.name === "EntityValueUpdated" &&
                event.payload.entityId === props.entityId) ||
              event.name === "DataSet",
          )
        ) {
          listener(data.entitiesValues[props.entityId]);
        }
      });
    },
    subscribeToError(listener) {
      return props.interpreterStore.subscribe((data, events) => {
        if (
          events.some(
            (event) =>
              (event.name === "EntityErrorUpdated" &&
                event.payload.entityId === props.entityId) ||
              event.name === "DataSet",
          )
        ) {
          listener(data.entitiesErrors[props.entityId]);
        }
      });
    },
  };

  const EntityComponent = props.components[
    entity.type
  ] as InterpreterEntityComponent<TBuilder["entities"][string], TBuilder>;

  if (!EntityComponent) {
    throw new Error(
      `<InterpreterEntity /> encountered an error:

No component was provided for the entity of type "${entity.type}".

This means that the "components" map passed to <InterpreterEntity /> does not include a React component for entities of type "${entity.type}".

To fix this:
- Ensure that the provided "components" map includes a component mapped to the entity type "${entity.type}".
- If you're conditionally passing components, verify that all expected types are covered.`,
    );
  }

  const isUnprocessable = useInterpreterStoreData(
    props.interpreterStore,
    (data) => data.unprocessableEntitiesIds.includes(props.entityId),
  );

  if (isUnprocessable) {
    return null;
  }

  const renderEntity = props.children ?? ((props) => props.children);

  return renderEntity({
    entity: entityForRender,
    children: (
      <EntityComponent
        entity={entityForRender}
        RenderChild={({ entityId, children }) => (
          <InterpreterEntity
            interpreterStore={props.interpreterStore}
            entityId={entityId}
            components={props.components}
          >
            {(childProps) => chainRenderers(renderEntity, children)(childProps)}
          </InterpreterEntity>
        )}
        RenderChildren={({ children }) =>
          entity.children?.map((childId) => (
            <InterpreterEntity
              key={childId}
              entityId={childId}
              interpreterStore={props.interpreterStore}
              components={props.components}
            >
              {(childProps) =>
                chainRenderers(renderEntity, children)(childProps)
              }
            </InterpreterEntity>
          ))
        }
      />
    ),
  });
}

export function InterpreterEntities<TBuilder extends Builder>(props: {
  interpreterStore: InterpreterStore<TBuilder>;
  components: InterpreterEntitiesComponents<TBuilder>;
  children?: GenericInterpreterEntityComponent<TBuilder>;
}): ReactNode {
  return props.interpreterStore.schema.root.map((entityId) => (
    <InterpreterEntity
      key={entityId}
      entityId={entityId}
      components={props.components}
      interpreterStore={props.interpreterStore}
    >
      {props.children}
    </InterpreterEntity>
  ));
}

export function useEntityValue<
  TEntity extends Entity,
  TData = EntityValue<TEntity> | undefined,
>(
  entity: InterpreterEntityInstance<TEntity>,
  selector: (data: EntityValue<TEntity> | undefined) => TData = (data) =>
    data as TData,
  comparator: (oldData: TData, newData: TData) => boolean = shallow,
): TData {
  const dataCache = useRef(selector(entity.getValue()));

  return useSyncExternalStore(
    (listen) =>
      entity.subscribeToValue((data) => {
        const newData = selector(data);

        if (!comparator(dataCache.current, newData)) {
          dataCache.current = newData;

          listen();
        }
      }),
    () => dataCache.current,
    () => dataCache.current,
  );
}

export function useEntityError<TEntity extends Entity, TData>(
  entity: InterpreterEntityInstance<TEntity>,
  selector: (data: unknown) => TData = (data) => data as TData,
  comparator: (oldData: TData, newData: TData) => boolean = shallow,
): TData {
  const dataCache = useRef(selector(entity.getError()));

  return useSyncExternalStore(
    (listen) =>
      entity.subscribeToError((data) => {
        const newData = selector(data);

        if (!comparator(dataCache.current, newData)) {
          dataCache.current = newData;

          listen();
        }
      }),
    () => dataCache.current,
    () => dataCache.current,
  );
}
