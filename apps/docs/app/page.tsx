"use client";

import { type ReactNode } from "react";
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
  useBuilderStore,
  useBuilderStoreData,
} from "@builder/react";

import { createFormBuilder } from "./builder";
import { validateForm } from "./test";

const { textEntity, labelInput, visibleWhenInput, formBuilder } =
  createFormBuilder();

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
    const builderStoreData = useBuilderStoreData<typeof formBuilder>();

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
          }}
        >
          <option value="">Select</option>
          {Array.from(builderStoreData.schema.entities.entries()).map(
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

function SortableItem(props: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.children}
    </div>
  );
}

export default function Page() {
  const builderStore = useBuilderStore(formBuilder, {
    events: {
      onEntityDeleted(payload) {
        builderStore.getData().schema.entities.forEach((entity, id) => {
          if (
            "visibleWhen" in entity.inputs &&
            entity.inputs.visibleWhen?.entityId === payload.entity.id
          ) {
            builderStore.setEntityInput(id, "visibleWhen", undefined);
          }
        });
      },
    },
  });

  const [selectedEntityId, setSelectedEntityId] =
    useActiveEntityId(builderStore);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const builderStoreData = useBuilderStoreData(builderStore);

  return (
    <>
      <button
        onClick={() => {
          builderStore.addEntity({
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

          const index = Array.from(builderStoreData.schema.root).findIndex(
            (id) => id === overId,
          );

          builderStore.setEntityIndex(e.active.id, index);
        }}
      >
        <SortableContext
          items={Array.from(builderStoreData.schema.root)}
          strategy={verticalListSortingStrategy}
        >
          <Builder.Entities
            builderStore={builderStore}
            entitiesComponents={{
              text: textComponent,
            }}
          >
            {(props) => {
              return (
                <SortableItem id={props.entity.id}>
                  <div
                    style={{
                      paddingLeft: "1rem",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderColor:
                        selectedEntityId === props.entity.id
                          ? "blue"
                          : "transparent",
                    }}
                    onClick={() => setSelectedEntityId(props.entity.id)}
                  >
                    {props.children}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        builderStore.deleteEntity(props.entity.id);
                      }}
                    >
                      delete
                    </button>
                  </div>
                </SortableItem>
              );
            }}
          </Builder.Entities>
        </SortableContext>
      </DndContext>
      <Builder.Inputs
        builderStore={builderStore}
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
          builderStore.resetEntitiesInputsErrors();

          const res = await validateForm(
            builderStore.getSerializedData().schema,
          );
          console.log(res);

          setTimeout(() => {
            if (
              !res.success &&
              res.reason.code ===
                schemaValidationErrorCodes.InvalidEntitiesInputs
            ) {
              builderStore.setSerializedData({
                ...builderStore.getSerializedData(),
                ...res.reason.payload,
              });

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
