import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  createBuilderStore,
  type Attribute,
  type AttributeValue,
  type AttributeValueValidationResult,
  type Builder,
  type BuilderStore,
  type BuilderStoreData,
  type BuilderStoreEvent,
  type Entity,
  type EntityAttributesErrors,
  type EntityAttributesValues,
  type SchemaEntityWithId,
} from "@coltorapps/builder";

import { chainRenderers, shallow, type EventsListeners } from "./utils";

export interface AttributeInstance<TAttribute extends Attribute = Attribute> {
  name: string;
  getValue(): AttributeValue<TAttribute>;
  setValue(value: AttributeValue<TAttribute>): void;
  getError(): unknown;
  validate(): Promise<AttributeValueValidationResult<TAttribute>>;
  subscribeToValue(
    listener: (value: AttributeValue<TAttribute>) => void,
  ): () => void;
  subscribeToError(listener: (error: unknown) => void): () => void;
}

export interface BuilderEntityInstance<TEntity extends Entity = Entity>
  extends Pick<
    SchemaEntityWithId<TEntity>,
    "id" | "parentId" | "children" | "type"
  > {
  attributes: {
    [K in keyof TEntity["attributes"]]: AttributeInstance<
      TEntity["attributes"][K]
    >;
  };
  setParent(parentId: string, options?: { index?: number }): void;
  unsetParent(options?: { index?: number }): void;
  setIndex(index: number): void;
  setEntityAttribute<
    TAttributeName extends Extract<keyof TEntity["attributes"], string>,
  >(
    attributeName: TAttributeName,
    attributeValue: AttributeValue<TEntity["attributes"][TAttributeName]>,
  ): void;
  delete(): void;
  getAttributesValues(): EntityAttributesValues<TEntity>;
  getAttributesErrors(): EntityAttributesErrors<TEntity>;
  subscribeToAttributesValues(
    listener: (value: EntityAttributesValues<TEntity>) => void,
  ): () => void;
  subscribeToAttributesErrors(
    listener: (
      errors: Partial<Record<keyof TEntity["attributes"], unknown>>,
    ) => void,
  ): () => void;
}

export interface BuilderEntityComponentProps<
  TEntity extends TBuilder["entities"][string],
  TBuilder extends Builder = Builder,
> {
  entity: BuilderEntityInstance<TEntity>;
  builderStore: BuilderStore<TBuilder>;
  RenderChildren(props: {
    children?: GenericBuilderEntityComponent<TBuilder>;
  }): ReactNode;
  RenderChild(props: {
    entityId: string;
    children?: GenericBuilderEntityComponent<TBuilder>;
  }): ReactNode;
}

export type BuilderEntityComponent<
  TEntity extends TBuilder["entities"][string],
  TBuilder extends Builder = Builder,
> = (props: BuilderEntityComponentProps<TEntity, TBuilder>) => ReactNode;

export type BuilderEntitiesComponents<TBuilder extends Builder = Builder> = {
  [K in Extract<keyof TBuilder["entities"], string>]: BuilderEntityComponent<
    TBuilder["entities"][K],
    TBuilder
  >;
};

export type GenericBuilderEntityComponent<TBuilder extends Builder = Builder> =
  (props: {
    entity: BuilderEntityInstance<TBuilder["entities"][string]>;
    children?: ReactNode;
  }) => ReactNode;

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

export function useBuilderStoreData<
  TBuilder extends Builder,
  TData = BuilderStoreData<TBuilder>,
>(
  builderStore: BuilderStore<TBuilder>,
  selector: (
    data: BuilderStoreData<TBuilder>,
    events: Array<BuilderStoreEvent<TBuilder>>,
  ) => TData = (data) => data as TData,
  comparator: (
    oldData: TData,
    newData: TData,
    events: Array<BuilderStoreEvent<TBuilder>>,
  ) => boolean = shallow,
): TData {
  const dataCache = useRef(selector(builderStore.getData(), []));

  return useSyncExternalStore(
    (listen) =>
      builderStore.subscribe((data, events) => {
        const newData = selector(data, events);

        if (!comparator(dataCache.current, newData, events)) {
          dataCache.current = newData;

          listen();
        }
      }),
    () => dataCache.current,
    () => dataCache.current,
  );
}

export function BuilderEntity<TBuilder extends Builder>(props: {
  entityId: string;
  builderStore: BuilderStore<TBuilder>;
  components: BuilderEntitiesComponents<TBuilder>;
  children?: GenericBuilderEntityComponent<TBuilder>;
}): ReactNode {
  const entity = useBuilderStoreData(props.builderStore, (data) => {
    const entity = data.schema.entities[props.entityId];

    if (!entity) {
      return null;
    }

    return {
      id: props.entityId,
      type: entity.type,
      parentId: entity.parentId,
      children: entity.children,
    };
  });

  if (!entity) {
    throw new Error(
      `<BuilderEntity /> encountered an error:

Attempted to render an entity with ID "${props.entityId}", but it does not exist in the provided builder store.

This can happen if:
- The entity with the specified ID does not exist in the builder store.
- The builder store is being recreated on every render. Common causes include:
  • Not memoizing the store instance properly (e.g., by not using "useBuilderStore").
  • Recreating the builder definition on each render, which causes the store to be re-initialized.

Make sure the builder store instance is stable across renders and that the entity exists before attempting to render this component.`,
    );
  }

  const EntityComponent = props.components[
    entity.type
  ] as BuilderEntityComponent<TBuilder["entities"][string], TBuilder>;

  if (!EntityComponent) {
    throw new Error(
      `<BuilderEntity /> encountered an error:

No component was provided for the entity of type "${entity.type}".

This means that the "components" map passed to <BuilderEntity /> does not include a React component for entities of type "${entity.type}".

To fix this:
- Ensure that the provided "components" map includes a component mapped to the entity type "${entity.type}".
- If you're conditionally passing components, verify that all expected types are covered.`,
    );
  }

  const attributes = Object.keys(
    props.builderStore.builder.entities[entity.type]?.attributes ?? {},
  ).reduce(
    (result, attributeName) => ({
      ...result,
      [attributeName]: {
        name: attributeName,
        getValue() {
          const entity = props.builderStore.getEntity(props.entityId);

          if (!entity) {
            throw new Error(
              `Entity with ID "${props.entityId}" was not found.`,
            );
          }

          return entity.attributes[attributeName];
        },
        setValue(value) {
          props.builderStore.setEntityAttribute(
            props.entityId,
            attributeName,
            value,
          );
        },
        getError() {
          return props.builderStore.getEntitiesAttributesErrors()[entity.id]?.[
            attributeName
          ];
        },
        validate() {
          return props.builderStore.validateEntityAttribute(
            props.entityId,
            attributeName,
          );
        },
        subscribeToValue(listener) {
          return props.builderStore.subscribe((data, events) => {
            const entity = data.schema.entities[props.entityId];

            if (!entity) {
              return;
            }

            if (
              events.some(
                (event) =>
                  (event.name === "EntityAttributeUpdated" &&
                    event.payload.entity.id === props.entityId) ||
                  event.name === "DataSet",
              )
            ) {
              listener(entity.attributes[attributeName]);
            }
          });
        },
        subscribeToError(listener) {
          return props.builderStore.subscribe((data, events) => {
            if (
              events.some(
                (event) =>
                  (event.name === "EntityAttributeErrorUpdated" &&
                    event.payload.entity.id === props.entityId &&
                    event.payload.entity.updatedAttributeName ===
                      attributeName) ||
                  event.name === "DataSet",
              )
            ) {
              listener(
                data.entitiesAttributesErrors[props.entityId]?.[attributeName],
              );
            }
          });
        },
      } satisfies AttributeInstance<Attribute>,
    }),
    {} as BuilderEntityInstance<TBuilder["entities"][string]>["attributes"],
  );

  const entityForRender: BuilderEntityInstance<TBuilder["entities"][string]> = {
    id: props.entityId,
    type: entity.type,
    parentId: entity.parentId,
    attributes,
    setParent(parentId, options) {
      props.builderStore.setEntityParent(props.entityId, parentId, options);
    },
    unsetParent(options) {
      props.builderStore.unsetEntityParent(props.entityId, options);
    },
    setIndex(index) {
      props.builderStore.setEntityIndex(props.entityId, index);
    },
    setEntityAttribute(attributeName, attributeValue) {
      props.builderStore.setEntityAttribute(
        props.entityId,
        attributeName,
        attributeValue,
      );
    },
    delete() {
      props.builderStore.deleteEntity(props.entityId);
    },
    getAttributesValues() {
      const entity = props.builderStore.getEntity(props.entityId);

      if (!entity) {
        throw new Error(`Entity with ID "${props.entityId}" was not found.`);
      }

      return entity.attributes;
    },
    getAttributesErrors() {
      return (
        props.builderStore.getEntitiesAttributesErrors()[props.entityId] ?? {}
      );
    },
    subscribeToAttributesValues(listener) {
      return props.builderStore.subscribe((data, events) => {
        const entity = data.schema.entities[props.entityId];

        if (!entity) {
          return;
        }

        if (
          events.some(
            (event) =>
              (event.name === "EntityAttributeUpdated" &&
                event.payload.entity.id === props.entityId) ||
              event.name === "DataSet",
          )
        ) {
          listener(entity.attributes);
        }
      });
    },
    subscribeToAttributesErrors(listener) {
      return props.builderStore.subscribe((_data, events) => {
        if (
          events.some(
            (event) =>
              (event.name === "EntityAttributeErrorUpdated" &&
                event.payload.entity.id === props.entityId) ||
              event.name === "DataSet",
          )
        ) {
          listener(
            (props.builderStore.getEntitiesAttributesErrors()[props.entityId] ??
              {}) as Partial<
              Record<keyof TBuilder["entities"][string]["attributes"], unknown>
            >,
          );
        }
      });
    },
  };

  const renderEntity = props.children ?? ((props) => props.children);

  return renderEntity({
    entity: entityForRender,
    children: (
      <EntityComponent
        entity={entityForRender}
        builderStore={props.builderStore}
        RenderChild={({ entityId, children }) => (
          <BuilderEntity
            builderStore={props.builderStore}
            entityId={entityId}
            components={props.components}
          >
            {(childProps) => chainRenderers(renderEntity, children)(childProps)}
          </BuilderEntity>
        )}
        RenderChildren={({ children }) =>
          entity.children?.map((childId) => (
            <BuilderEntity
              key={childId}
              entityId={childId}
              builderStore={props.builderStore}
              components={props.components}
            >
              {(childProps) =>
                chainRenderers(renderEntity, children)(childProps)
              }
            </BuilderEntity>
          ))
        }
      />
    ),
  });
}

export function BuilderEntities<TBuilder extends Builder>(props: {
  builderStore: BuilderStore<TBuilder>;
  components: BuilderEntitiesComponents<TBuilder>;
  children?: GenericBuilderEntityComponent<TBuilder>;
}): JSX.Element[] {
  const root = useBuilderStoreData(
    props.builderStore,
    (data) => data.schema.root,
  );

  return root.map((entityId) => (
    <BuilderEntity
      key={entityId}
      entityId={entityId}
      components={props.components}
      builderStore={props.builderStore}
    >
      {props.children}
    </BuilderEntity>
  ));
}

export function useAttributeValue<
  TAttribute extends Attribute,
  TData = AttributeValue<TAttribute>,
>(
  attribute: AttributeInstance<TAttribute>,
  selector: (data: AttributeValue<TAttribute>) => TData = (data) =>
    data as TData,
  comparator: (oldData: TData, newData: TData) => boolean = shallow,
): TData {
  const dataCache = useRef(selector(attribute.getValue()));

  return useSyncExternalStore(
    (listen) =>
      attribute.subscribeToValue((data) => {
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

export function useEntityAttributesValues<
  TEntity extends Entity,
  TData = EntityAttributesValues<TEntity>,
>(
  entity: BuilderEntityInstance<TEntity>,
  selector: (data: EntityAttributesValues<TEntity>) => TData = (data) =>
    data as TData,
  comparator: (oldData: TData, newData: TData) => boolean = shallow,
): TData {
  const dataCache = useRef(selector(entity.getAttributesValues()));

  return useSyncExternalStore(
    (listen) =>
      entity.subscribeToAttributesValues((data) => {
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

export function useAttributeError<TAttribute extends Attribute, TData>(
  attribute: AttributeInstance<TAttribute>,
  selector: (data: unknown) => TData = (data) => data as TData,
  comparator: (oldData: TData, newData: TData) => boolean = shallow,
): TData {
  const dataCache = useRef(selector(attribute.getError()));

  return useSyncExternalStore(
    (listen) =>
      attribute.subscribeToError((data) => {
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

export function useEntityAttributesErrors<
  TEntity extends Entity,
  TData = EntityAttributesErrors<TEntity>,
>(
  entity: BuilderEntityInstance<TEntity>,
  selector: (data: EntityAttributesErrors<TEntity>) => TData = (data) =>
    data as TData,
  comparator: (oldData: TData, newData: TData) => boolean = shallow,
): TData {
  const dataCache = useRef(selector(entity.getAttributesErrors()));

  return useSyncExternalStore(
    (listen) =>
      entity.subscribeToAttributesErrors((data) => {
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
