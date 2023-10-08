import {
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  builderStoreEventsNames,
  createBuilder,
  createBuilderStore,
  type Builder as BaseBuilder,
  type BuilderStore,
  type BuilderStoreData,
  type BuilderStoreEntityWithId,
  type BuilderStoreEvent,
  type EntitiesInputsErrors,
  type Schema,
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
    initialSchema?: Schema<TBuilder>;
    initialEntitiesInputsErrors?: EntitiesInputsErrors<TBuilder>;
    events?: EventsListeners<TBuilder, BuilderStoreEvent<TBuilder>>;
  } = {},
): BuilderStore<TBuilder> {
  const builderStoreRef = useRef(
    createBuilderStore({
      builder,
      serializedData: {
        schema: options.initialSchema,
        entitiesInputsErrors: options.initialEntitiesInputsErrors,
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

type EntitiesComponents<TBuilder extends BaseBuilder = BaseBuilder> = {
  [K in TBuilder["entities"][number]["name"]]: EntityComponent<
    Extract<TBuilder["entities"][number], { name: K }>
  >;
};

type BuilderStoreContextValue<TBuilder extends BaseBuilder = BaseBuilder> = {
  builderStore: BuilderStore<TBuilder>;
};

type BuilderContextValue<TBuilder extends BaseBuilder = BaseBuilder> = {
  entitiesComponents: EntitiesComponents<TBuilder>;
  renderEntity: GenericEntityRender<TBuilder>;
};

const dummyBuilder = createBuilder({ entities: [] });

const dummyBuilderStore = createBuilderStore({
  builder: dummyBuilder,
});

const BuilderStoreContext = createContext<BuilderStoreContextValue>({
  builderStore: dummyBuilderStore,
});

const EntitiesContext = createContext<BuilderContextValue>({
  entitiesComponents: {},
  renderEntity: (props) => props.children,
});

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
}): ReactNode {
  const { entitiesComponents, renderEntity } = useContext(EntitiesContext);

  const { builderStore } = useContext(BuilderStoreContext);

  const data = useBuilderStoreData(builderStore, (events) =>
    events.some(
      (event) =>
        (event.name === builderStoreEventsNames.EntityUpdated &&
          event.payload.entity.id === props.entityId) ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  const entity = data.schema.entities.get(props.entityId);

  if (!entity) {
    throw new Error("Entity not found.");
  }

  const childrenIds = Array.from(entity?.children ?? []);

  const EntityComponent = entitiesComponents[entity.type];

  if (!EntityComponent) {
    throw new Error("Entity component not found.");
  }

  const entityForRender: EntityForRender = {
    ...entity,
    id: props.entityId,
  };

  return renderEntity({
    entity: entityForRender,
    children: (
      <EntityComponent
        entity={entityForRender}
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

function RootEntities(): ReactNode {
  const { builderStore } = useContext(BuilderStoreContext);

  const data = useBuilderStoreData(builderStore, (events) =>
    events.some(
      (event) =>
        event.name === builderStoreEventsNames.RootUpdated ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  return Array.from(data.schema.root).map((entityId) => (
    <MemoizedEntity key={entityId} entityId={entityId} />
  ));
}

function Entities<TBuilder extends BaseBuilder>(props: {
  builderStore: BuilderStore<TBuilder>;
  entitiesComponents: EntitiesComponents<TBuilder>;
  children?: GenericEntityRender<TBuilder>;
}): ReactNode {
  return (
    <BuilderStoreContext.Provider
      value={{
        builderStore: props.builderStore,
      }}
    >
      <EntitiesContext.Provider
        value={{
          entitiesComponents:
            props.entitiesComponents as unknown as EntitiesComponents,
          renderEntity:
            (props.children as GenericEntityRender) ??
            ((props) => props.children),
        }}
      >
        <RootEntities />
      </EntitiesContext.Provider>
    </BuilderStoreContext.Provider>
  );
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
  entity: BuilderStoreEntityWithId<TBuilder>;
  input: {
    [K in KeyofUnion<
      BuilderStoreEntityWithId<TBuilder>["inputs"]
    >]: InputForRender<
      Extract<TBuilder["entities"][number]["inputs"][number], { name: K }>
    >;
  }[KeyofUnion<BuilderStoreEntityWithId<TBuilder>["inputs"]>];
  children: JSX.Element;
};

type GenericInputRender<TBuilder extends BaseBuilder = BaseBuilder> = {
  (props: GenericInputRenderProps<TBuilder>): JSX.Element;
};

type InputsContextValue<TBuilder extends BaseBuilder = BaseBuilder> = {
  inputsComponents: InputsComponents<TBuilder>;
  renderInput: GenericInputRender<TBuilder>;
  entity: BuilderStoreEntityWithId<TBuilder>;
};

const InputsContext = createContext<InputsContextValue>({
  renderInput: (props) => props.children,
  inputsComponents: {},
  entity: {
    id: "",
    type: "",
    inputs: {},
  },
});

const MemoizedInput = memo(function Input(props: {
  inputName: string;
}): ReactNode {
  const { inputsComponents, entity, renderInput } = useContext(InputsContext);

  const { builderStore } = useContext(BuilderStoreContext);

  const InputComponent = inputsComponents[entity.type]?.[props.inputName];

  if (!InputComponent) {
    throw new Error("Input component not found.");
  }

  const data = useBuilderStoreData(builderStore, (events) =>
    events.some(
      (event) =>
        (event.name === builderStoreEventsNames.EntityInputUpdated &&
          event.payload.entity.id === entity.id &&
          event.payload.inputName === props.inputName) ||
        (event.name === builderStoreEventsNames.EntityInputErrorUpdated &&
          event.payload.inputName === props.inputName) ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  const inputValue = data.schema.entities.get(entity.id)?.inputs[
    props.inputName
  ];

  const inputError = data.entitiesInputsErrors.get(entity.id)?.[
    props.inputName
  ];

  const input = {
    name: props.inputName,
    value: inputValue,
    error: inputError,
  };

  return renderInput({
    entity,
    input,
    children: (
      <InputComponent
        input={input}
        entity={entity}
        onChange={(value) =>
          builderStore.setEntityInput(entity.id, props.inputName, value)
        }
        validate={() =>
          builderStore.validateEntityInput(entity.id, props.inputName)
        }
      />
    ),
  });
});

function Inputs<TBuilder extends BaseBuilder>(props: {
  builderStore: BuilderStore<TBuilder>;
  inputsComponents: InputsComponents<TBuilder>;
  children?: GenericInputRender<TBuilder>;
  entityId?: string | null;
}): ReactNode {
  const entity = props.entityId
    ? props.builderStore.getData().schema.entities.get(props.entityId)
    : null;

  if (!props.entityId || !entity) {
    return null;
  }

  const entityDefinition = props.builderStore.builder.entities.find(
    (item) => item.name === entity.type,
  );

  if (!entityDefinition) {
    throw new Error("Entity definition was not found.");
  }

  return (
    <BuilderStoreContext.Provider
      value={{
        builderStore: props.builderStore,
      }}
    >
      <InputsContext.Provider
        value={{
          inputsComponents:
            props.inputsComponents as unknown as InputsComponents,
          entity: {
            ...entity,
            id: props.entityId,
          },
          renderInput:
            (props.children as GenericInputRender) ??
            ((props) => props.children),
        }}
        key={props.entityId}
      >
        {entityDefinition.inputs.map((item) => (
          <MemoizedInput key={item.name} inputName={item.name} />
        ))}
      </InputsContext.Provider>
    </BuilderStoreContext.Provider>
  );
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
      !builderStore.getData().schema.entities.has(activeEntityId)
    ) {
      throw new Error("Entity not found.");
    }

    return builderStore.subscribe((data) => {
      if (activeEntityId && !data.schema.entities.has(activeEntityId)) {
        setActiveEntityId(null);
      }
    });
  }, [activeEntityId, builderStore]);

  return [activeEntityId, setActiveEntityId];
}

export function useBuilderStoreData<TBuilder extends BaseBuilder>(
  builderStore?: BuilderStore<TBuilder>,
  shouldUpdate: (events: Array<BuilderStoreEvent<TBuilder>>) => boolean = () =>
    true,
): BuilderStoreData<TBuilder> {
  const { builderStore: contextBuilderStore } = useContext(BuilderStoreContext);

  const usedBuilderStore = builderStore ?? contextBuilderStore;

  const dataCache = useRef(usedBuilderStore.getData());

  return useSyncExternalStore(
    (listen) =>
      usedBuilderStore.subscribe((data, events) => {
        if (shouldUpdate(events as Array<BuilderStoreEvent<TBuilder>>)) {
          dataCache.current = data;

          listen();
        }
      }),
    () => dataCache.current,
    () => dataCache.current,
  ) as BuilderStoreData<TBuilder>;
}

export const Builder = {
  Entities,
  Inputs,
};
