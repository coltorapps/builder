import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  builderStoreEventsNames,
  createBuilderStore,
  type Builder as BaseBuilder,
  type BuilderStore,
  type BuilderStoreData,
  type BuilderStoreEvent,
} from "basebuilder";

import {
  type AttributesComponents,
  type GenericAttributeComponent,
} from "./attributes";
import {
  type EntitiesComponents,
  type EntityForRender,
  type GenericEntityComponent,
} from "./entities";
import { type EventsListeners } from "./utils";

export function useBuilderStore<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  options: {
    initialData?: Partial<BuilderStoreData<TBuilder>>;
    events?: EventsListeners<BuilderStoreEvent<TBuilder>>;
  } = {},
): BuilderStore<TBuilder> {
  const builderStoreRef = useMemo(
    () =>
      createBuilderStore(builder, {
        initialData: {
          schema: options.initialData?.schema,
          entitiesAttributesErrors:
            options.initialData?.entitiesAttributesErrors,
        },
      }),
    [
      builder,
      options.initialData?.entitiesAttributesErrors,
      options.initialData?.schema,
    ],
  );

  useEffect(() => {
    return builderStoreRef.subscribe((_data, events) => {
      events.forEach((event) => {
        const listener = options.events?.[`on${event.name}`] as
          | undefined
          | ((payload: BuilderStoreEvent<TBuilder>["payload"]) => void);

        listener?.(event.payload);
      });
    });
  }, [builderStoreRef, options.events]);

  return builderStoreRef;
}

export function useBuilderStoreData<TBuilder extends BaseBuilder>(
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

const MemoizedEntity = memo(function Entity(props: {
  entityId: string;
  components: EntitiesComponents;
  renderEntity: GenericEntityComponent;
  builderStore: BuilderStore;
}): JSX.Element {
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
    throw new Error("Entity not found.");
  }

  const childrenIds = entity?.children ?? [];

  const EntityComponent = props.components[entity.type];

  if (!EntityComponent) {
    throw new Error("Entity component not found.");
  }

  const entityForRender: EntityForRender = {
    ...entity,
    id: props.entityId,
  };

  return props.renderEntity({
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
        validate={() => {
          return new Promise((resolve) => resolve());
        }}
      >
        {childrenIds.map((entityId) => (
          <MemoizedEntity key={entityId} {...props} />
        ))}
      </EntityComponent>
    ),
  });
});

function Entities<TBuilder extends BaseBuilder>(props: {
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

  const renderEntity =
    (props.children as GenericEntityComponent) ?? ((props) => props.children);

  return data.schema.root.map((entityId) => (
    <MemoizedEntity
      key={entityId}
      entityId={entityId}
      renderEntity={renderEntity}
      builderStore={props.builderStore}
      components={props.components as unknown as EntitiesComponents}
    />
  ));
}

const MemoizedAttribute = memo(function Attribute(props: {
  attributeName: string;
  entityId: string;
  entityType: string;
  builderStore: BuilderStore;
  components: AttributesComponents;
  renderAttribute: GenericAttributeComponent;
}): ReactNode {
  const AttributeComponent =
    props.components[props.entityType]?.[props.attributeName];

  if (!AttributeComponent) {
    throw new Error("Attribute component not found.");
  }

  const data = useBuilderStoreData(props.builderStore, (events) =>
    events.some(
      (event) =>
        (event.name === builderStoreEventsNames.EntityAttributeUpdated &&
          event.payload.entity.id === props.entityId &&
          event.payload.attributeName === props.attributeName) ||
        (event.name === builderStoreEventsNames.EntityAttributeErrorUpdated &&
          event.payload.entity.id === props.entityId &&
          event.payload.attributeName === props.attributeName) ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  const entity = data.schema.entities[props.entityId];

  if (!entity) {
    throw new Error("Entity not found.");
  }

  const attributeValue = entity.attributes[props.attributeName];

  const attributeError =
    data.entitiesAttributesErrors[props.entityId]?.[props.attributeName];

  const attribute = {
    name: props.attributeName,
    value: attributeValue,
    error: attributeError,
  };

  const entityWithId = {
    ...entity,
    id: props.entityId,
  };

  return props.renderAttribute({
    entity: entityWithId,
    attribute,
    children: (
      <AttributeComponent
        attribute={attribute}
        entity={entityWithId}
        setValue={(value) =>
          props.builderStore.setEntityAttribute(
            props.entityId,
            props.attributeName,
            value,
          )
        }
        validate={() =>
          props.builderStore.validateEntityAttribute(
            props.entityId,
            props.attributeName,
          )
        }
        resetError={() =>
          props.builderStore.resetEntityAttributeError(
            props.entityId,
            props.attributeName,
          )
        }
      />
    ),
  });
});

function Attributes<TBuilder extends BaseBuilder>(props: {
  builderStore: BuilderStore<TBuilder>;
  components: AttributesComponents<TBuilder>;
  children?: GenericAttributeComponent<TBuilder>;
  entityId: string;
}): JSX.Element[] {
  const entity = props.builderStore.getData().schema.entities[props.entityId];

  if (!entity) {
    throw new Error("Entity not found.");
  }

  const entityDefinition = props.builderStore.builder.entities.find(
    (item) => item.name === entity.type,
  );

  if (!entityDefinition) {
    throw new Error("Entity definition not found.");
  }

  const renderAttribute =
    (props.children as GenericAttributeComponent) ??
    ((props) => props.children);

  return entityDefinition.attributes.map((item) => (
    <MemoizedAttribute
      key={`${props.entityId}-${item.name}`}
      attributeName={item.name}
      entityId={props.entityId}
      entityType={entity.type}
      components={props.components as unknown as AttributesComponents}
      renderAttribute={renderAttribute}
      builderStore={props.builderStore}
    />
  ));
}

export const Builder = {
  Entities,
  Attributes,
};
