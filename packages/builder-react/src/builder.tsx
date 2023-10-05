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
  createBuilder,
  createInputsValidationStore,
  createSchemaStore,
  inputsValidationStoreEventsNames,
  schemaStoreEventsNames,
  type Builder as BaseBuilder,
  type EntitiesInputsErrors,
  type InputsValidationStore,
  type InputsValidationStoreData,
  type InputsValidationStoreEvent,
  type Schema,
  type SchemaStore,
  type SchemaStoreData,
  type SchemaStoreEntityWithId,
  type SchemaStoreEvent,
} from "builder";

import { type EntityComponent, type EntityForRender } from "./entities";
import { type InputComponent, type InputForRender } from "./inputs";
import { type KeyofUnion } from "./utils";

type EventsListeners<
  TBuilder extends BaseBuilder,
  TEvent extends
    | SchemaStoreEvent<TBuilder>
    | InputsValidationStoreEvent<TBuilder>,
> = {
  [K in `on${TEvent["name"]}`]?: K extends `on${infer REventName}`
    ? (payload: Extract<TEvent, { name: REventName }>["payload"]) => void
    : never;
};

export function useBuilder<TBuilder extends BaseBuilder>(
  builder: TBuilder,
  options: {
    initialSchema?: Schema<TBuilder>;
    initialEntitiesInputsErrors?: EntitiesInputsErrors<TBuilder>;
    events?: {
      schemaStore?: EventsListeners<TBuilder, SchemaStoreEvent<TBuilder>>;
      inputsValidationStore?: EventsListeners<
        TBuilder,
        InputsValidationStoreEvent<TBuilder>
      >;
    };
  } = {},
): {
  builder: TBuilder;
  schemaStore: SchemaStore<TBuilder>;
  inputsValidationStore: InputsValidationStore<TBuilder>;
} {
  const schemaStoreRef = useRef(
    createSchemaStore({ builder, serializedData: options.initialSchema }),
  );

  const inputsValidationStoreRef = useRef(
    createInputsValidationStore({
      schemaStore: schemaStoreRef.current,
      builder,
      serializedData: {
        entitiesInputsErrors: options.initialEntitiesInputsErrors ?? {},
      },
    }),
  );

  useEffect(() => {
    return schemaStoreRef.current.subscribe((_data, events) => {
      events.forEach((event) => {
        const listener = options.events?.schemaStore?.[`on${event.name}`] as
          | undefined
          | ((payload: SchemaStoreEvent<TBuilder>["payload"]) => void);

        listener?.(event.payload);
      });
    });
  }, [options.events?.schemaStore]);

  useEffect(() => {
    return inputsValidationStoreRef.current.subscribe((_, events) => {
      events.forEach((event) => {
        const listener = options.events?.inputsValidationStore?.[
          `on${event.name}`
        ] as
          | undefined
          | ((
              payload: InputsValidationStoreEvent<TBuilder>["payload"],
            ) => void);

        listener?.(event.payload);
      });
    });
  }, [options.events?.inputsValidationStore]);

  return {
    builder,
    schemaStore: schemaStoreRef.current,
    inputsValidationStore: inputsValidationStoreRef.current,
  };
}

type EntitiesComponents<TBuilder extends BaseBuilder = BaseBuilder> = {
  [K in TBuilder["entities"][number]["name"]]: EntityComponent<
    Extract<TBuilder["entities"][number], { name: K }>
  >;
};

interface SchemaStoreContextValue<TBuilder extends BaseBuilder = BaseBuilder> {
  schemaStore: SchemaStore<TBuilder>;
}

interface BuilderContextValue<TBuilder extends BaseBuilder = BaseBuilder> {
  entitiesComponents: EntitiesComponents<TBuilder>;
  renderEntity: GenericEntityRender<TBuilder>;
}

const dummyBuilder = createBuilder({ entities: [] });

const dummySchemaStore = createSchemaStore({
  builder: dummyBuilder,
});

const dummyInputsValidationStore = createInputsValidationStore({
  builder: dummyBuilder,
  schemaStore: dummySchemaStore,
});

const SchemaStoreContext = createContext<SchemaStoreContextValue>({
  schemaStore: dummySchemaStore,
});

const EntitiesContext = createContext<BuilderContextValue>({
  entitiesComponents: {},
  renderEntity: (props) => props.children,
});

export interface GenericEntityRenderProps<
  TBuilder extends BaseBuilder = BaseBuilder,
> {
  entity: EntityForRender<TBuilder>;
  children: JSX.Element;
}
interface GenericEntityRender<TBuilder extends BaseBuilder = BaseBuilder> {
  (props: GenericEntityRenderProps<TBuilder>): JSX.Element;
}

const MemoizedEntity = memo(function Entity(props: {
  entityId: string;
}): ReactNode {
  const { entitiesComponents, renderEntity } = useContext(EntitiesContext);

  const { schemaStore } = useContext(SchemaStoreContext);

  const entityCache = useRef(
    schemaStore.getData().entities.get(props.entityId),
  );

  const entity = useSyncExternalStore(
    (listen) =>
      schemaStore.subscribe((data, events) => {
        if (
          events.some(
            (event) =>
              (event.name === schemaStoreEventsNames.EntityUpdated &&
                event.payload.entity.id === props.entityId) ||
              event.name === schemaStoreEventsNames.DataSet,
          )
        ) {
          entityCache.current = data.entities.get(props.entityId);

          listen();
        }
      }),
    () => entityCache.current,
    () => entityCache.current,
  );

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
  const { schemaStore } = useContext(SchemaStoreContext);

  const rootCache = useRef(Array.from(schemaStore.getData().root));

  const root = useSyncExternalStore(
    (listen) =>
      schemaStore.subscribe((data, events) => {
        if (
          events.some(
            (event) =>
              event.name === schemaStoreEventsNames.RootUpdated ||
              event.name === schemaStoreEventsNames.DataSet,
          )
        ) {
          rootCache.current = Array.from(data.root);

          listen();
        }
      }),
    () => rootCache.current,
    () => rootCache.current,
  );

  return root.map((entityId) => (
    <MemoizedEntity key={entityId} entityId={entityId} />
  ));
}

function Entities<TBuilder extends BaseBuilder>(props: {
  schemaStore: SchemaStore<TBuilder>;
  entitiesComponents: EntitiesComponents<TBuilder>;
  children?: GenericEntityRender<TBuilder>;
}): ReactNode {
  return (
    <SchemaStoreContext.Provider
      value={{
        schemaStore: props.schemaStore,
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
    </SchemaStoreContext.Provider>
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

export interface GenericInputRenderProps<
  TBuilder extends BaseBuilder = BaseBuilder,
> {
  entity: SchemaStoreEntityWithId<TBuilder>;
  input: {
    [K in KeyofUnion<
      SchemaStoreEntityWithId<TBuilder>["inputs"]
    >]: InputForRender<
      Extract<TBuilder["entities"][number]["inputs"][number], { name: K }>
    >;
  }[KeyofUnion<SchemaStoreEntityWithId<TBuilder>["inputs"]>];
  children: JSX.Element;
}

interface GenericInputRender<TBuilder extends BaseBuilder = BaseBuilder> {
  (props: GenericInputRenderProps<TBuilder>): JSX.Element;
}

interface InputsContextValue<TBuilder extends BaseBuilder = BaseBuilder> {
  inputsValidationStore: InputsValidationStore<TBuilder>;
  inputsComponents: InputsComponents<TBuilder>;
  renderInput: GenericInputRender<TBuilder>;
  entity: SchemaStoreEntityWithId<TBuilder>;
}

const InputsContext = createContext<InputsContextValue>({
  inputsValidationStore: dummyInputsValidationStore,
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
  const {
    inputsComponents,
    inputsValidationStore,

    entity,
    renderInput,
  } = useContext(InputsContext);

  const { schemaStore } = useContext(SchemaStoreContext);

  const InputComponent = inputsComponents[entity.type]?.[props.inputName];

  if (!InputComponent) {
    throw new Error("Input component not found.");
  }

  const inputValueCache = useRef(
    schemaStore.getData().entities.get(entity.id)?.inputs[props.inputName],
  );

  const inputValue = useSyncExternalStore(
    (listen) =>
      schemaStore.subscribe((data, events) => {
        if (
          events.some(
            (event) =>
              (event.name === schemaStoreEventsNames.EntityInputUpdated &&
                event.payload.entity.id === entity.id &&
                event.payload.inputName === props.inputName) ||
              event.name === schemaStoreEventsNames.DataSet,
          )
        ) {
          inputValueCache.current = data.entities.get(entity.id)?.inputs[
            props.inputName
          ];

          listen();
        }
      }),
    () => inputValueCache.current,
    () => inputValueCache.current,
  );

  const inputErrorCache = useRef(
    inputsValidationStore.getData().entitiesInputsErrors.get(entity.id)?.[
      props.inputName
    ],
  );

  const inputError = useSyncExternalStore(
    (listen) =>
      inputsValidationStore.subscribe((data, events) => {
        if (
          events.some(
            (event) =>
              (event.name ===
                inputsValidationStoreEventsNames.EntityInputErrorUpdated &&
                event.payload.inputName === props.inputName) ||
              event.name === inputsValidationStoreEventsNames.DataSet,
          )
        ) {
          inputErrorCache.current = data.entitiesInputsErrors.get(entity.id)?.[
            props.inputName
          ];

          listen();
        }
      }),
    () => inputErrorCache.current,
    () => inputErrorCache.current,
  );

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
          schemaStore.setEntityInput(entity.id, props.inputName, value)
        }
        validate={() =>
          inputsValidationStore.validateEntityInput(entity.id, props.inputName)
        }
      />
    ),
  });
});

function Inputs<TBuilder extends BaseBuilder>(props: {
  builder: TBuilder;
  schemaStore: SchemaStore<TBuilder>;
  inputsValidationStore: InputsValidationStore<TBuilder>;
  inputsComponents: InputsComponents<TBuilder>;
  children?: GenericInputRender<TBuilder>;
  entityId?: string | null;
}): ReactNode {
  const entity = props.entityId
    ? props.schemaStore.getData().entities.get(props.entityId)
    : null;

  if (!props.entityId || !entity) {
    return null;
  }

  const entityDefinition = props.builder.entities.find(
    (item) => item.name === entity.type,
  );

  if (!entityDefinition) {
    throw new Error("Entity definition was not found.");
  }

  return (
    <SchemaStoreContext.Provider
      value={{
        schemaStore: props.schemaStore,
      }}
    >
      <InputsContext.Provider
        value={{
          inputsValidationStore: props.inputsValidationStore,
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
    </SchemaStoreContext.Provider>
  );
}

export function useActiveEntityId(
  schemaStore: SchemaStore,
  initialActiveEntityId: string | null = null,
): [string | null, (id: string | null) => void] {
  const [activeEntityId, setActiveEntityId] = useState<string | null>(
    initialActiveEntityId,
  );

  useEffect(() => {
    if (activeEntityId && !schemaStore.getData().entities.has(activeEntityId)) {
      throw new Error("Entity not found.");
    }

    return schemaStore.subscribe((data) => {
      if (activeEntityId && !data.entities.has(activeEntityId)) {
        setActiveEntityId(null);
      }
    });
  }, [activeEntityId, schemaStore]);

  return [activeEntityId, setActiveEntityId];
}

export function useSchemaStore<
  TBuilder extends BaseBuilder,
>(): SchemaStore<TBuilder> {
  const { schemaStore } = useContext(SchemaStoreContext);

  return schemaStore as SchemaStore<TBuilder>;
}

export function useSchemaStoreData<TBuilder extends BaseBuilder>(
  schemaStore?: SchemaStore<TBuilder>,
): SchemaStoreData<TBuilder> {
  const { schemaStore: contextSchemaStore } = useContext(SchemaStoreContext);

  const usedSchemaStore = schemaStore ?? contextSchemaStore;

  return useSyncExternalStore(
    (listen) => usedSchemaStore.subscribe(listen),
    () => usedSchemaStore.getData(),
    () => usedSchemaStore.getData(),
  ) as SchemaStoreData<TBuilder>;
}

export function useInputsValidationStore<
  TBuilder extends BaseBuilder,
>(): InputsValidationStore<TBuilder> {
  const { inputsValidationStore } = useContext(InputsContext);

  return inputsValidationStore as InputsValidationStore<TBuilder>;
}

export function useInputsValidationStoreData<TBuilder extends BaseBuilder>(
  inputsValidationStore?: InputsValidationStore<TBuilder>,
): InputsValidationStoreData<TBuilder> {
  const { inputsValidationStore: contextInputsValidationStore } =
    useContext(InputsContext);

  const usedInputsValidationStore =
    inputsValidationStore ?? contextInputsValidationStore;

  return useSyncExternalStore(
    (listen) => usedInputsValidationStore.subscribe(listen),
    () => usedInputsValidationStore.getData(),
    () => usedInputsValidationStore.getData(),
  ) as InputsValidationStoreData<TBuilder>;
}

export const Builder = {
  Entities,
  Inputs,
};
