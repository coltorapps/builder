import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  createInterpreterStore,
  type Attribute,
  type Builder,
  type Entity,
  type EntityValue,
  type EntityValueValidationResult,
  type InterpreterStore,
  type InterpreterStoreData,
  type InterpreterStoreOptions,
  type Schema,
  type SchemaEntityWithId,
} from "@coltorapps/builder";

import { chainRenderers, shallow, type Comparator } from "./utils";

export interface InterpreterEntityInstance<
  TEntity extends Entity = Entity,
  TType extends string = string,
> extends Pick<
    SchemaEntityWithId<TEntity, TType>,
    "id" | "parentId" | "children" | "type" | "attributes"
  > {
  metadata: TEntity["metadata"];
  getValue(): EntityValue<TEntity> | undefined;
  setValue(value: EntityValue<TEntity>): void;
  getError(): unknown;
  setError(value: unknown): void;
  resetValue(): void;
  clearValue(): void;
  resetError(): void;
  validate(): Promise<EntityValueValidationResult<TEntity>>;
  subscribeToValue(
    listener: (value: EntityValue<TEntity> | undefined) => void,
  ): () => void;
  subscribeToError(listener: (error: unknown) => void): () => void;
}

export interface InterpreterEntityComponentProps<
  TEntity extends Entity,
  TBuilder extends Builder = Builder,
> {
  entity: InterpreterEntityInstance<TEntity>;
  interpreterStore: InterpreterStore<TBuilder>;
  RenderChildren(props: {
    children?: GenericInterpreterEntityComponent<TBuilder>;
  }): ReactNode;
  RenderChild(props: {
    entityId: string;
    children?: GenericInterpreterEntityComponent<TBuilder>;
  }): ReactNode;
}

export type InterpreterEntityComponent<
  TEntity extends Entity,
  TBuilder extends Builder = Builder,
> = (props: InterpreterEntityComponentProps<TEntity, TBuilder>) => ReactNode;

export type InterpreterEntitiesComponents<TBuilder extends Builder = Builder> =
  {
    [K in Extract<keyof TBuilder["entities"], string>]:
      | InterpreterEntityComponent<TBuilder["entities"][K], TBuilder>
      | InterpreterEntityComponent<TBuilder["entities"][K]>;
  };

export type GenericInterpreterEntityComponent<
  TBuilder extends Builder = Builder,
> = (props: {
  entity: {
    [K in Extract<
      keyof TBuilder["entities"],
      string
    >]: InterpreterEntityInstance<TBuilder["entities"][K], K>;
  }[Extract<keyof TBuilder["entities"], string>];
  children?: ReactNode;
}) => ReactNode;

export function useInterpreterStore<TBuilder extends Builder>(
  builder: TBuilder,
  schema: Schema<TBuilder>,
  options: InterpreterStoreOptions<TBuilder> = {},
): InterpreterStore<TBuilder> {
  const interpreterStore = useMemo(
    () => createInterpreterStore(builder, schema, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [builder, schema],
  );

  return interpreterStore;
}

export function useInterpreterStoreData<TBuilder extends Builder, TData>(
  interpreterStore: InterpreterStore<TBuilder>,
  selector: (data: InterpreterStoreData<TBuilder>) => TData = (data) =>
    data as TData,
  comparator: Comparator<TData> = shallow,
): TData {
  const dataCache = useRef(selector(interpreterStore.getData()));

  return useSyncExternalStore(
    (listen) =>
      interpreterStore.subscribe((data) => {
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
    TBuilder["entities"][Extract<keyof TBuilder["entities"], string>],
    Extract<keyof TBuilder["entities"], string>
  > = {
    ...entity,
    id: props.entityId,
    metadata: entityDefinition.metadata,
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
    resetValue() {
      return props.interpreterStore.resetEntityValue(props.entityId);
    },
    clearValue() {
      return props.interpreterStore.clearEntityValue(props.entityId);
    },
    resetError() {
      return props.interpreterStore.resetEntityError(props.entityId);
    },
    subscribeToValue(listener, comparator = shallow) {
      return props.interpreterStore.subscribe((data, prevData) => {
        const value = data.entitiesValues[props.entityId];

        const prevValue = prevData.entitiesValues[props.entityId];

        if (!comparator(value, prevValue)) {
          listener(value);
        }
      });
    },
    subscribeToError(listener, comparator = shallow) {
      return props.interpreterStore.subscribe((data, prevData) => {
        const value = data.entitiesErrors[props.entityId];

        const prevValue = prevData.entitiesErrors[props.entityId];

        if (!comparator(value, prevValue)) {
          listener(value);
        }
      });
    },
  };

  const EntityComponent = props.components[
    entity.type
  ] as unknown as InterpreterEntityComponent<
    TBuilder["entities"][string],
    TBuilder
  >;

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
        interpreterStore={props.interpreterStore}
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
  TEntity extends Entity<Record<string, Attribute>, unknown, true>,
  TData = EntityValue<TEntity> | undefined,
>(
  entity: InterpreterEntityInstance<TEntity>,
  selector: (data: EntityValue<TEntity> | undefined) => TData = (data) =>
    data as TData,
  comparator: Comparator<TData> = shallow,
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

export function useEntityError<
  TEntity extends Entity<Record<string, Attribute>, unknown, true>,
  TData,
>(
  entity: InterpreterEntityInstance<TEntity>,
  selector: (data: unknown) => TData = (data) => data as TData,
  comparator: Comparator<TData> = shallow,
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

export function useEntityValueUpdated<TBuilder extends Builder>(
  interpreterStore: InterpreterStore<TBuilder>,
  callback: (
    args: {
      [K in Extract<keyof TBuilder["entities"], string>]: SchemaEntityWithId<
        TBuilder["entities"][K],
        K
      > & {
        value?: EntityValue<TBuilder["entities"][K]>;
        prevValue?: EntityValue<TBuilder["entities"][K]>;
      };
    }[Extract<keyof TBuilder["entities"], string>],
  ) => void,
  comparator: Comparator<
    EntityValue<TBuilder["entities"][string]> | undefined
  > = shallow,
) {
  useEffect(
    () =>
      interpreterStore.subscribe((data, prevData) => {
        const prevEntitiesValues = prevData.entitiesValues;

        const entitiesValues = data.entitiesValues;

        for (const entityId of Object.keys(entitiesValues)) {
          const prevValue = prevEntitiesValues[entityId];

          const value = entitiesValues[entityId];

          const entity = interpreterStore.schema.entities[entityId];

          if (entity && !comparator(prevValue, value)) {
            callback({ ...entity, id: entityId, value, prevValue });
          }
        }
      }),
    [interpreterStore, callback, comparator],
  );
}

export function useEntityProcessabilityChanged<TBuilder extends Builder>(
  interpreterStore: InterpreterStore<TBuilder>,
  callback: (
    args: {
      [K in Extract<keyof TBuilder["entities"], string>]: SchemaEntityWithId<
        TBuilder["entities"][K],
        K
      > & {
        processable: boolean;
        prevProcessable: boolean;
      };
    }[Extract<keyof TBuilder["entities"], string>],
  ) => void,
) {
  useEffect(() => {
    return interpreterStore.subscribe((data, prevData) => {
      const currentSet = new Set(data.unprocessableEntitiesIds);

      const prevSet = new Set(prevData.unprocessableEntitiesIds);

      const allIds = new Set([
        ...data.unprocessableEntitiesIds,
        ...prevData.unprocessableEntitiesIds,
      ]);

      for (const entityId of allIds) {
        const isNowUnprocessable = currentSet.has(entityId);

        const wasUnprocessable = prevSet.has(entityId);

        const entity = interpreterStore.schema.entities[entityId];

        if (isNowUnprocessable !== wasUnprocessable && entity) {
          callback({
            ...entity,
            id: entityId,
            processable: !isNowUnprocessable,
            prevProcessable: !wasUnprocessable,
          });
        }
      }
    });
  }, [interpreterStore, callback]);
}
