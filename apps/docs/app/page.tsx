"use client";

import { DndContext, MouseSensor, useSensor } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { schemaValidationErrorCodes } from "builder";

import {
  Builder,
  createEntityComponent,
  createInputComponent,
  useActiveEntityId,
  useBuilder,
  useInputsValidationStore,
  useSchemaStore,
  useSchemaStoreData,
  useSchemaStoreRoot,
  type GenericEntityRenderProps,
} from "@builder/react";

import { builder, labelInput, textEntity, visibleWhenInput } from "./builder";
import { testServer } from "./test";

const textComponent = createEntityComponent(textEntity, ({ entity }) => {
  return (
    <div className="bg-white shadow rounded p-4">
      {entity.inputs.label} {entity.id}
      <input />
    </div>
  );
});

const visibleWhenComponent = createInputComponent(
  visibleWhenInput,
  ({ input, onChange, validate }) => {
    const schemaStoreData = useSchemaStoreData<typeof builder>();
    const err = useInputsValidationStore();

    return (
      <div>
        Visible when
        <select
          value={input.value?.entityId ?? ""}
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onChange={async (e) => {
            if (!e.target.value) {
              onChange(undefined);
            } else {
              onChange({ entityId: e.target.value });
            }

            await validate();

            setTimeout(() => {
              console.log(err.resetEntitiesInputsErrors());
            }, 1000);
          }}
        >
          <option value="">Select</option>
          {Array.from(schemaStoreData.entities.entries()).map(
            ([id, entity]) => (
              <option key={id} value={id}>
                {entity.inputs.label}
              </option>
            ),
          )}
        </select>
        <span style={{ color: "red" }}>
          {typeof input.error === "string"
            ? input.error
            : JSON.stringify(input.error)}
        </span>
      </div>
    );
  },
);

const labelComponent = createInputComponent(
  labelInput,
  ({ input, onChange, validate }) => {
    return (
      <div>
        Label
        <input
          value={input.value ?? ""}
          onChange={(e) => {
            onChange(e.target.value);

            void validate();
          }}
        />
        <span style={{ color: "red" }}>
          {typeof input.error === "string"
            ? input.error
            : JSON.stringify(input.error)}
        </span>
      </div>
    );
  },
);

function RenderEntity({
  children,
  entity,
  selectedEntityId,
  setSelectedEntityId,
}: GenericEntityRenderProps<typeof builder> & {
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: entity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const schemaStore = useSchemaStore();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();

        setSelectedEntityId(entity.id);
      }}
    >
      <div
        style={{
          paddingLeft: "1rem",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: selectedEntityId === entity.id ? "blue" : "transparent",
        }}
      >
        {children}{" "}
        <button
          onClick={(e) => {
            e.stopPropagation();
            schemaStore.deleteEntity(entity.id);
          }}
        >
          delete
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const client = useBuilder(builder, {
    events: {
      schemaStore: {
        onEntityDeleted(payload) {
          const entities = client.schemaStore.getData().entities;

          entities.forEach((entity, id) => {
            if (
              entity.type === "text" &&
              entity.inputs.visibleWhen?.entityId === payload.entity.id
            ) {
              client.schemaStore.setEntityInput(id, "visibleWhen", undefined);
            }
          });
        },
      },
      inputsValidationStore: {
        onEntityInputErrorUpdated(payload) {
          payload.entityId;
        },
      },
    },
  });

  const [selectedEntityId, setSelectedEntityId] = useActiveEntityId(
    client.schemaStore,
  );

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const root = useSchemaStoreRoot(client.schemaStore);

  return (
    <>
      <button
        onClick={() => {
          client.schemaStore.addEntity({
            type: "text",
            inputs: {
              label: "Text Input" + Math.random().toString(),
            },
          });
        }}
      >
        add
      </button>

      <DndContext
        sensors={[mouseSensor]}
        onDragEnd={(e) => {
          const overId = e.over?.id;

          if (!overId || typeof e.active.id !== "string") {
            return;
          }

          const index = Array.from(client.schemaStore.getData().root).findIndex(
            (id) => id === overId,
          );

          client.schemaStore.setEntityIndex(e.active.id, index);
        }}
      >
        <SortableContext
          items={Array.from(root)}
          strategy={verticalListSortingStrategy}
        >
          <Builder.Entities
            {...client}
            entitiesComponents={{
              text: textComponent,
            }}
          >
            {(props) => {
              return (
                <>
                  <RenderEntity
                    {...props}
                    selectedEntityId={selectedEntityId}
                    setSelectedEntityId={setSelectedEntityId}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      client.schemaStore.deleteEntity(props.entity.id);
                    }}
                  >
                    delete
                  </button>
                </>
              );
            }}
          </Builder.Entities>
        </SortableContext>
      </DndContext>
      <Builder.Inputs
        {...client}
        entityId={selectedEntityId}
        inputsComponents={{
          text: {
            visibleWhen: visibleWhenComponent,
            label: labelComponent,
          },
        }}
      />
      <div className="text-3xl">test</div>
      <button
        className="bg-red-500 text-red-500"
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick={async () => {
          const res = await testServer(client.schemaStore.getSerializedData());

          console.log(res);
          client.inputsValidationStore.resetEntitiesInputsErrors();

          setTimeout(() => {
            if (
              !res.success &&
              res.reason.code ===
                schemaValidationErrorCodes.InvalidEntitiesInputs
            ) {
              client.inputsValidationStore.setSerializedData(
                res.reason.payload,
              );

              const firstEntityWithErrors = Object.keys(
                res.reason.payload.entitiesInputsErrors,
              )[0];

              if (
                selectedEntityId &&
                res.reason.payload.entitiesInputsErrors[selectedEntityId]
              ) {
                return;
              }

              if (firstEntityWithErrors) {
                setSelectedEntityId(firstEntityWithErrors);
              }
            }
          }, 1000);
        }}
      >
        go
      </button>
    </>
  );
}
