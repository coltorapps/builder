import {
  memo,
  useEffect,
  useRef,
  useState,
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
  type SchemaEntityWithId,
} from "builder";

import { type EntityComponent, type EntityForRender } from "./entities";
import { type InputComponent, type InputForRender } from "./inputs";
import { type KeyofUnion } from "./utils";

type EventsListeners<
  TBuilder extends BaseBuilder,
  TEvent extends BuilderStoreEvent<TBuilder>,
> = {
  [K in `on${TEvent["name"]}`]?: K extends `on${infer REventName}`
    ? (payload: Extract<TEvent, { name: REventName }>["payload"]) => void
    : never;
};

export function useBuilderStore<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  options: {
    initialData?: Partial<BuilderStoreData<TBuilder>>;
    events?: EventsListeners<TBuilder, BuilderStoreEvent<TBuilder>>;
  } = {},
): BuilderStore<TBuilder> {
  const builderStoreRef = useRef(
    createBuilderStore({
      builder,
      initialData: {
        schema: options.initialData?.schema,
        entitiesInputsErrors: options.initialData?.entitiesInputsErrors,
      },
    }),
  );

  useEffect(() => {
    return builderStoreRef.current.subscribe((_data, events) => {
      events.forEach((event) => {
        const listener = options.events?.[`on${event.name}`] as
          | undefined
          | ((payload: BuilderStoreEvent<TBuilder>["payload"]) => void);

        listener?.(event.payload);
      });
    });
  }, [options.events]);

  return builderStoreRef.current;
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

type EntitiesComponents<TBuilder extends BaseBuilder = BaseBuilder> = {
  [K in TBuilder["entities"][number]["name"]]: EntityComponent<
    Extract<TBuilder["entities"][number], { name: K }>
  >;
};

export type GenericEntityRenderProps<
  TBuilder extends BaseBuilder = BaseBuilder,
> = {
  entity: EntityForRender<TBuilder>;
  children: JSX.Element;
};
type GenericEntityRender<TBuilder extends BaseBuilder = BaseBuilder> = {
  (props: GenericEntityRenderProps<TBuilder>): JSX.Element;
};

const MemoizedEntity = memo(function Entity(props: {
  entityId: string;
  entitiesComponents: EntitiesComponents;
  renderEntity: GenericEntityRender;
  builderStore: BuilderStore;
}): ReactNode {
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

  const EntityComponent = props.entitiesComponents[entity.type];

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
  entitiesComponents: EntitiesComponents<TBuilder>;
  children?: GenericEntityRender<TBuilder>;
}): JSX.Element[] {
  const data = useBuilderStoreData(props.builderStore, (events) =>
    events.some(
      (event) =>
        event.name === builderStoreEventsNames.RootUpdated ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  const renderEntity =
    (props.children as GenericEntityRender) ?? ((props) => props.children);

  return data.schema.root.map((entityId) => (
    <MemoizedEntity
      key={entityId}
      entityId={entityId}
      renderEntity={renderEntity}
      builderStore={props.builderStore}
      entitiesComponents={
        props.entitiesComponents as unknown as EntitiesComponents
      }
    />
  ));
}

type InputsComponents<TBuilder extends BaseBuilder = BaseBuilder> = {
  [K in TBuilder["entities"][number]["name"]]: {
    [K2 in Extract<
      TBuilder["entities"][number],
      { name: K }
    >["inputs"][number]["name"]]: InputComponent<
      Extract<
        Extract<TBuilder["entities"][number], { name: K }>["inputs"][number],
        { name: K2 }
      >
    >;
  };
};

export type GenericInputRenderProps<
  TBuilder extends BaseBuilder = BaseBuilder,
> = {
  entity: SchemaEntityWithId<TBuilder>;
  input: {
    [K in KeyofUnion<SchemaEntityWithId<TBuilder>["inputs"]>]: InputForRender<
      Extract<TBuilder["entities"][number]["inputs"][number], { name: K }>
    >;
  }[KeyofUnion<SchemaEntityWithId<TBuilder>["inputs"]>];
  children: JSX.Element;
};

type GenericInputRender<TBuilder extends BaseBuilder = BaseBuilder> = {
  (props: GenericInputRenderProps<TBuilder>): JSX.Element;
};

const MemoizedInput = memo(function Input(props: {
  inputName: string;
  entityId: string;
  entityType: string;
  builderStore: BuilderStore;
  inputsComponents: InputsComponents;
  renderInput: GenericInputRender;
}): ReactNode {
  const InputComponent =
    props.inputsComponents[props.entityType]?.[props.inputName];

  if (!InputComponent) {
    throw new Error("Input component not found.");
  }

  const data = useBuilderStoreData(props.builderStore, (events) =>
    events.some(
      (event) =>
        (event.name === builderStoreEventsNames.EntityInputUpdated &&
          event.payload.entity.id === props.entityId &&
          event.payload.inputName === props.inputName) ||
        (event.name === builderStoreEventsNames.EntityInputErrorUpdated &&
          event.payload.entity.id === props.entityId &&
          event.payload.inputName === props.inputName) ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  const entity = data.schema.entities[props.entityId];

  if (!entity) {
    throw new Error("Entity not found.");
  }

  const inputValue = entity.inputs[props.inputName];

  const inputError =
    data.entitiesInputsErrors[props.entityId]?.[props.inputName];

  const input = {
    name: props.inputName,
    value: inputValue,
    error: inputError,
  };

  const entityWithId = {
    ...entity,
    id: props.entityId,
  };

  return props.renderInput({
    entity: entityWithId,
    input,
    children: (
      <InputComponent
        input={input}
        entity={entityWithId}
        setValue={(value) =>
          props.builderStore.setEntityInput(
            props.entityId,
            props.inputName,
            value,
          )
        }
        validate={() =>
          props.builderStore.validateEntityInput(
            props.entityId,
            props.inputName,
          )
        }
        resetError={() =>
          props.builderStore.resetEntityInputError(
            props.entityId,
            props.inputName,
          )
        }
      />
    ),
  });
});

function Inputs<TBuilder extends BaseBuilder>(props: {
  builderStore: BuilderStore<TBuilder>;
  inputsComponents: InputsComponents<TBuilder>;
  children?: GenericInputRender<TBuilder>;
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

  const renderInput =
    (props.children as GenericInputRender) ?? ((props) => props.children);

  return entityDefinition.inputs.map((item) => (
    <MemoizedInput
      key={`${props.entityId}-${item.name}`}
      inputName={item.name}
      entityId={props.entityId}
      entityType={entity.type}
      inputsComponents={props.inputsComponents as unknown as InputsComponents}
      renderInput={renderInput}
      builderStore={props.builderStore}
    />
  ));
}

export function useActiveEntityId(
  builderStore: BuilderStore,
  initialActiveEntityId: string | null = null,
): [string | null, (id: string | null) => void] {
  const [activeEntityId, setActiveEntityId] = useState<string | null>(
    initialActiveEntityId,
  );

  useEffect(() => {
    if (
      activeEntityId &&
      !builderStore.getData().schema.entities[activeEntityId]
    ) {
      throw new Error("Entity not found.");
    }

    return builderStore.subscribe((data) => {
      if (activeEntityId && !data.schema.entities[activeEntityId]) {
        setActiveEntityId(null);
      }
    });
  }, [activeEntityId, builderStore]);

  return [activeEntityId, setActiveEntityId];
}

export const Builder = {
  Entities,
  Inputs,
};
