"use client";

import { useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@builder/react";

import { createFormBuilder } from "./builder";
import { validateForm } from "./validate-form";

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

const createVisibleWhenComponent = (options: {
  useOptions: () => Array<{ value: string; label: string }>;
}) =>
  createInputComponent(
    visibleWhenInput,
    ({ input, entity, onChange, validate }) => {
      const entitiesOptions = options.useOptions();

      const items = entitiesOptions.filter((item) => item.value !== entity.id);
      console.log("vis");

      return (
        <div className="mb-4">
          <Select
            value={input.value?.entityId ?? ""}
            onValueChange={(value) => {
              if (!value) {
                onChange(undefined);
              } else {
                onChange({ entityId: value });
              }

              void validate();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Field" />
            </SelectTrigger>
            <SelectContent>
              {items.length ? (
                items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))
              ) : (
                <p className="py-6 text-center text-sm">Noth</p>
              )}
            </SelectContent>
          </Select>
        </div>
      );
    },
  );

const labelComponent = createInputComponent(
  labelInput,
  ({ input, onChange, validate }) => {
    console.log("label");

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
        Object.entries(builderStore.getData().schema.entities).forEach(
          ([id, entity]) => {
            if (
              "visibleWhen" in entity.inputs &&
              entity.inputs.visibleWhen?.entityId === payload.entity.id
            ) {
              builderStore.setEntityInput(id, "visibleWhen", undefined);
            }
          },
        );
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

  const builderStoreData = builderStore.useData((events) =>
    events.some((event) => event.name === "RootUpdated"),
  );

  const [isPending, startTransition] = useTransition();

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
      {selectedEntityId ? (
        <Builder.Inputs
          builderStore={builderStore}
          entityId={selectedEntityId}
          inputsComponents={{
            text: {
              visibleWhen: createVisibleWhenComponent({
                useOptions() {
                  return Object.entries(
                    builderStore.useData().schema.entities,
                  ).map(([id, entity]) => ({
                    value: id,
                    label: entity.inputs.label,
                  }));
                },
              }),
              label: labelComponent,
            },
          }}
        />
      ) : null}
      <div className="text-3xl">test</div>
      <button
        onClick={() => {
          startTransition(async () => {
            builderStore.resetEntitiesInputsErrors();

            const res = await validateForm(builderStore.getData().schema);

            if (
              !res.success &&
              res.reason.code ===
                schemaValidationErrorCodes.InvalidEntitiesInputs
            ) {
              builderStore.setEntitiesInputsErrors(
                res.reason.payload.entitiesInputsErrors,
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
          });
        }}
      >
        {isPending ? "LOADING..." : "SAVE"}
      </button>
      <div className="max-w-xs mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Ha</Label>
            <Input />
            <ErrorMessage>haha</ErrorMessage>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Save</Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
