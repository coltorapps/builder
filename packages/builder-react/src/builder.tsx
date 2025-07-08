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
  type Entity,
  type EntityAttributesErrors,
  type EntityAttributesValues,
  type Schema,
  type SchemaEntityWithId,
} from "@coltorapps/builder";

import { chainRenderers, shallow, type Comparator } from "./utils";

export interface AttributeInstance<TAttribute extends Attribute = Attribute> {
  type: string;
  getValue(): AttributeValue<TAttribute>;
  setValue(value: AttributeValue<TAttribute>): void;
  getError(): unknown;
  validate(): Promise<AttributeValueValidationResult<TAttribute>>;
  setError(error: unknown): void;
  subscribeToValue(
    listener: (value: AttributeValue<TAttribute>) => void,
    comparator?: Comparator<AttributeValue<TAttribute>>,
  ): () => void;
  subscribeToError(
    listener: (error: unknown) => void,
    comparator?: Comparator<unknown>,
  ): () => void;
}

export interface BuilderEntityInstance<
  TEntity extends Entity = Entity,
  TType extends string = string,
> extends Pick<
    SchemaEntityWithId<TEntity, TType>,
    "id" | "parentId" | "children" | "type"
  > {
  attributes: {
    [K in keyof TEntity["attributes"]]: AttributeInstance<
      TEntity["attributes"][K]
    >;
  };
  metadata: TEntity["metadata"];
  setParent(parentId: string, options?: { index?: number }): void;
  unsetParent(options?: { index?: number }): void;
  setIndex(index: number): void;
  setAttribute<
    TAttributeName extends Extract<keyof TEntity["attributes"], string>,
  >(
    attributeName: TAttributeName,
    attributeValue: AttributeValue<TEntity["attributes"][TAttributeName]>,
  ): void;
  delete(): void;
  clone(): void;
  validateAttribute(
    attributeName: Extract<keyof TEntity["attributes"], string>,
  ): Promise<AttributeValueValidationResult>;
  resetAttributeError(
    attributeName: Extract<keyof TEntity["attributes"], string>,
  ): void;
  resetAttributesErrors(): void;
  setAttributesErrors(
    entityAttributesErrors: EntityAttributesErrors<TEntity>,
  ): void;
  setAttributeError(
    attributeName: Extract<keyof TEntity["attributes"], string>,
    error: unknown,
  ): void;
  validateAttributes(): Promise<void>;
  getAttributesValues(): EntityAttributesValues<TEntity>;
  getAttributesErrors(): EntityAttributesErrors<TEntity>;
  subscribeToAttributesValues(
    listener: (value: EntityAttributesValues<TEntity>) => void,
    comparator?: Comparator<EntityAttributesValues<TEntity>>,
  ): () => void;
  subscribeToAttributesErrors(
    listener: (errors: EntityAttributesErrors<TEntity>) => void,
    comparator?: Comparator<EntityAttributesErrors<TEntity> | undefined>,
  ): () => void;
}

export interface BuilderEntityComponentProps<
  TEntity extends Entity,
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
  TEntity extends Entity,
  TBuilder extends Builder = Builder,
> = (props: BuilderEntityComponentProps<TEntity, TBuilder>) => ReactNode;

export type BuilderEntitiesComponents<TBuilder extends Builder = Builder> = {
  [K in Extract<keyof TBuilder["entities"], string>]:
    | BuilderEntityComponent<TBuilder["entities"][K], TBuilder>
    | BuilderEntityComponent<TBuilder["entities"][K]>;
};

export type GenericBuilderEntityComponent<TBuilder extends Builder = Builder> =
  (props: {
    entity: {
      [K in Extract<keyof TBuilder["entities"], string>]: BuilderEntityInstance<
        TBuilder["entities"][K],
        K
      >;
    }[Extract<keyof TBuilder["entities"], string>];
    children?: ReactNode;
  }) => ReactNode;

export function useBuilderStore<TBuilder extends Builder>(
  builder: TBuilder,
  options: {
    initialData?: Partial<BuilderStoreData<TBuilder>>;
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

  return builderStore;
}

export function useBuilderStoreData<
  TBuilder extends Builder,
  TData = BuilderStoreData<TBuilder>,
>(
  builderStore: BuilderStore<TBuilder>,
  selector: (data: BuilderStoreData<TBuilder>) => TData = (data) =>
    data as TData,
  comparator: (oldData: TData, newData: TData) => boolean = shallow,
): TData {
  const dataCache = useRef(selector(builderStore.getData()));

  return useSyncExternalStore(
    (listen) =>
      builderStore.subscribe((data) => {
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
  ] as unknown as BuilderEntityComponent<
    TBuilder["entities"][string],
    TBuilder
  >;

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

  const entityDefinition = props.builderStore.builder.entities[entity.type];

  if (!entityDefinition) {
    throw new Error(
      `<BuilderEntity /> encountered an error:

Attempted to render an entity of type "${entity.type}", but this type is not registered in the builder definition used to create the provided builder store.

Ensure that the builder definition includes an entity of type "${entity.type}".`,
    );
  }

  const attributes = Object.keys(entityDefinition.attributes ?? {}).reduce(
    (result, attributeName) => ({
      ...result,
      [attributeName]: {
        type: attributeName,
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
        setError(error) {
          return props.builderStore.setEntityAttributeError(
            entity.id,
            attributeName,
            error,
          );
        },
        validate() {
          return props.builderStore.validateEntityAttribute(
            props.entityId,
            attributeName,
          );
        },
        subscribeToValue(listener, comparator = shallow) {
          return props.builderStore.subscribe((data, prevData) => {
            const value =
              data.schema.entities[props.entityId]?.attributes[attributeName];

            const prevValue =
              prevData.schema.entities[props.entityId]?.attributes[
                attributeName
              ];

            if (!comparator(value, prevValue)) {
              listener(value);
            }
          });
        },
        subscribeToError(listener, comparator = shallow) {
          return props.builderStore.subscribe((data, prevData) => {
            const value =
              data.entitiesAttributesErrors[props.entityId]?.[attributeName];

            const prevValue =
              prevData.entitiesAttributesErrors[props.entityId]?.[
                attributeName
              ];

            if (!comparator(value, prevValue)) {
              listener(value);
            }
          });
        },
      } satisfies AttributeInstance<Attribute>,
    }),
    {} as BuilderEntityInstance<TBuilder["entities"][string]>["attributes"],
  );

  const entityForRender: BuilderEntityInstance<
    TBuilder["entities"][string],
    Extract<keyof TBuilder["entities"], string>
  > = {
    id: props.entityId,
    type: entity.type,
    parentId: entity.parentId,
    attributes,
    metadata: entityDefinition.metadata,
    setParent(parentId, options) {
      props.builderStore.setEntityParent(props.entityId, parentId, options);
    },
    unsetParent(options) {
      props.builderStore.unsetEntityParent(props.entityId, options);
    },
    setIndex(index) {
      props.builderStore.setEntityIndex(props.entityId, index);
    },
    setAttribute(attributeName, attributeValue) {
      props.builderStore.setEntityAttribute(
        props.entityId,
        attributeName,
        attributeValue,
      );
    },
    validateAttribute(attributeName) {
      return props.builderStore.validateEntityAttribute(
        props.entityId,
        attributeName,
      );
    },
    validateAttributes() {
      return props.builderStore.validateEntityAttributes(props.entityId);
    },
    resetAttributeError(attributeName) {
      props.builderStore.resetEntityAttributeError(
        props.entityId,
        attributeName,
      );
    },
    resetAttributesErrors() {
      props.builderStore.resetEntityAttributesErrors(props.entityId);
    },
    setAttributesErrors(errors) {
      props.builderStore.setEntityAttributesErrors(props.entityId, errors);
    },
    setAttributeError(attributeName, error) {
      props.builderStore.setEntityAttributeError(
        props.entityId,
        attributeName,
        error,
      );
    },
    delete() {
      props.builderStore.deleteEntity(props.entityId);
    },
    clone() {
      props.builderStore.cloneEntity(props.entityId);
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
    subscribeToAttributesValues(listener, comparator = shallow) {
      return props.builderStore.subscribe((data, prevData) => {
        const entity = data.schema.entities[props.entityId];

        const previousEntity = prevData.schema.entities[props.entityId];

        if (!entity || !previousEntity) {
          return;
        }

        const value = entity.attributes;

        const prevValue = previousEntity.attributes;

        if (!entity) {
          return;
        }

        if (!comparator(value, prevValue)) {
          listener(value);
        }
      });
    },
    subscribeToAttributesErrors(listener, comparator = shallow) {
      return props.builderStore.subscribe((data, prevData) => {
        const value = data.entitiesAttributesErrors[props.entityId] ?? {};

        const prevValue =
          prevData.entitiesAttributesErrors[props.entityId] ?? {};

        if (!comparator(value, prevValue)) {
          listener(
            value as EntityAttributesErrors<TBuilder["entities"][string]>,
          );
        }
      });
    },
  };

  const renderEntity = useMemo(() => {
    return (
      props.children ?? ((props: { children?: ReactNode }) => props.children)
    );
  }, [props.children]);

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
}): ReactNode {
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
  comparator: Comparator<TData> = shallow,
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
  comparator: Comparator<TData> = shallow,
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
  comparator: Comparator<TData> = shallow,
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
  comparator: Comparator<TData> = shallow,
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

export function useEntityAdded<TBuilder extends Builder>(
  builderStore: BuilderStore<TBuilder>,
  callback: (
    entity: Schema<TBuilder>["entities"][string] & { id: string },
  ) => void,
) {
  useEffect(
    () =>
      builderStore.subscribe((data, prevData) => {
        const nextIds = Object.keys(data.schema.entities);

        const prevIds = new Set(Object.keys(prevData.schema.entities));

        for (const id of nextIds) {
          if (!prevIds.has(id) && data.schema.entities[id]) {
            callback({
              ...data.schema.entities[id],
              id,
            });
          }
        }
      }),
    [builderStore, callback],
  );
}

export function useEntityDeleted<TBuilder extends Builder>(
  builderStore: BuilderStore<TBuilder>,
  callback: (
    entity: Schema<TBuilder>["entities"][string] & { id: string },
  ) => void,
) {
  useEffect(
    () =>
      builderStore.subscribe((data, prevData) => {
        const nextIds = new Set(Object.keys(data.schema.entities));

        const prevIds = new Set(Object.keys(prevData.schema.entities));

        for (const id of prevIds) {
          if (!nextIds.has(id) && prevData.schema.entities[id]) {
            callback({ ...prevData.schema.entities[id], id });
          }
        }
      }),
    [builderStore, callback],
  );
}

type EntityWithUpdatedAttributeName<TBuilder extends Builder> = {
  [K in Extract<keyof TBuilder["entities"], string>]: SchemaEntityWithId<
    TBuilder["entities"][K],
    K
  > & {
    updatedAttributeName: keyof SchemaEntityWithId<
      TBuilder["entities"][K],
      K
    >["attributes"] &
      string;
  };
}[Extract<keyof TBuilder["entities"], string>];

export function useAttributeValueUpdated<TBuilder extends Builder>(
  builderStore: BuilderStore<TBuilder>,
  callback: (entity: EntityWithUpdatedAttributeName<TBuilder>) => void,
  comparator: Comparator<
    AttributeValue<TBuilder["entities"][string]["attributes"][string]>
  > = shallow,
) {
  useEffect(
    () =>
      builderStore.subscribe((data, prevData) => {
        const prevEntities = prevData.schema.entities;

        const entities = data.schema.entities;

        for (const id of Object.keys(entities)) {
          const entity = entities[id];

          const prevEntity = prevEntities[id];

          if (!prevEntity || !entity) {
            continue;
          }

          const attributesKeys = new Set([
            ...Object.keys(prevEntity.attributes),
            ...Object.keys(entity.attributes),
          ]);

          for (const key of attributesKeys) {
            if (
              !comparator(
                prevEntity.attributes[key] as AttributeValue<
                  TBuilder["entities"][string]["attributes"][string]
                >,
                entity.attributes[key] as AttributeValue<
                  TBuilder["entities"][string]["attributes"][string]
                >,
              )
            ) {
              callback({
                ...entity,
                id,
                updatedAttributeName: key,
              });
            }
          }
        }
      }),
    [builderStore, callback, comparator],
  );
}
