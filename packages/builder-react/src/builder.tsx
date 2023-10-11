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

export type ReactBuilderStore<TBuilder extends BaseBuilder = BaseBuilder> =
  BuilderStore<TBuilder> & {
    useData(
      shouldUpdate?: (events: Array<BuilderStoreEvent<TBuilder>>) => boolean,
    ): BuilderStoreData<TBuilder>;
  };

export function useBuilderStore<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  options: {
    initialData?: Partial<BuilderStoreData<TBuilder>>;
    events?: EventsListeners<TBuilder, BuilderStoreEvent<TBuilder>>;
  } = {},
): ReactBuilderStore<TBuilder> {
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

  return {
    ...builderStoreRef.current,
    useData(shouldUpdate = () => true) {
      const dataCache = useRef(builderStoreRef.current.getData());

      return useSyncExternalStore(
        (listen) =>
          builderStoreRef.current.subscribe((data, events) => {
            if (shouldUpdate(events)) {
              dataCache.current = data;

              listen();
            }
          }),
        () => dataCache.current,
        () => dataCache.current,
      );
    },
  };
}

type EntitiesComponents<TBuilder extends BaseBuilder = BaseBuilder> = {
  [K in TBuilder["entities"][number]["name"]]: EntityComponent<
    Extract<TBuilder["entities"][number], { name: K }>
  >;
};

type BuilderStoreContextValue<TBuilder extends BaseBuilder = BaseBuilder> = {
  builderStore: ReactBuilderStore<TBuilder>;
};

type BuilderContextValue<TBuilder extends BaseBuilder = BaseBuilder> = {
  entitiesComponents: EntitiesComponents<TBuilder>;
  renderEntity: GenericEntityRender<TBuilder>;
};

const dummyBuilder = createBuilder({ entities: [] });

const dummyBuilderStore = createBuilderStore({
  builder: dummyBuilder,
});

const dummyReactBuilderStore: ReactBuilderStore = {
  ...dummyBuilderStore,
  useData: () => dummyBuilderStore.getData(),
};

const BuilderStoreContext = createContext<BuilderStoreContextValue>({
  builderStore: dummyReactBuilderStore,
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

  const data = builderStore.useData((events) =>
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

  const data = builderStore.useData((events) =>
    events.some(
      (event) =>
        event.name === builderStoreEventsNames.RootUpdated ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  return data.schema.root.map((entityId) => (
    <MemoizedEntity key={entityId} entityId={entityId} />
  ));
}

function Entities<TBuilder extends BaseBuilder>(props: {
  builderStore: ReactBuilderStore<TBuilder>;
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

type InputsContextValue<TBuilder extends BaseBuilder = BaseBuilder> = {
  inputsComponents: InputsComponents<TBuilder>;
  renderInput: GenericInputRender<TBuilder>;
  entity: SchemaEntityWithId<TBuilder>;
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

  const data = builderStore.useData((events) =>
    events.some(
      (event) =>
        (event.name === builderStoreEventsNames.EntityInputUpdated &&
          event.payload.entity.id === entity.id &&
          event.payload.inputName === props.inputName) ||
        (event.name === builderStoreEventsNames.EntityInputErrorUpdated &&
          event.payload.entity.id === entity.id &&
          event.payload.inputName === props.inputName) ||
        event.name === builderStoreEventsNames.DataSet,
    ),
  );

  const inputValue = data.schema.entities[entity.id]?.inputs[props.inputName];

  const inputError = data.entitiesInputsErrors[entity.id]?.[props.inputName];

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
  builderStore: ReactBuilderStore<TBuilder>;
  inputsComponents: InputsComponents<TBuilder>;
  children?: GenericInputRender<TBuilder>;
  entityId?: string | null;
}): ReactNode {
  const entity = props.entityId
    ? props.builderStore.getData().schema.entities[props.entityId]
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
