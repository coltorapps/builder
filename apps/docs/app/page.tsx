"use client";

import {
  createContext,
  useContext,
  useTransition,
  type ReactNode,
} from "react";
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
import {
  createBuilderStore,
  schemaValidationErrorCodes,
  type BuilderStore,
} from "builder";

import {
  Builder,
  createAttributeComponent,
  createEntityComponent,
  Interpreter,
  useActiveEntityId,
  useBuilderStore,
  useBuilderStoreData,
  useEntitiesValues,
  useInterpreterStore,
} from "@builder/react";

import { createFormBuilder } from "./builder";
import { validateForm, validateSubmission } from "./validate-form";

const { textEntity, labelAttribute, visibleWhenAttribute, formBuilder } =
  createFormBuilder();

const textComponent = createEntityComponent(
  textEntity,
  ({ entity, setValue, validate }) => {
    console.log(useEntitiesValues(), entity.id);

    return (
      <div className="bg-white shadow rounded p-4">
        {entity.id} {entity.attributes.label}
        <input
          value={entity.value ?? ""}
          onChange={(e) => {
            setValue(e.target.value);
            void validate();
          }}
          className="border-2"
        />
        {entity.error ? String(entity.error) : null}
      </div>
    );
  },
);

const visibleWhenComponent = createAttributeComponent(
  visibleWhenAttribute,
  ({ attribute, entity, setValue, validate }) => {
    const { builderStore } = useContext(FormBuilderStoreContext);
    const entities = useBuilderStoreData(builderStore).schema.entities;
    console.log(builderStore.getData());

    const items = Object.entries(entities).filter(([id]) => id !== entity.id);

    return (
      <div className="mb-4">
        <Select
          value={attribute.value?.entityId ?? ""}
          onValueChange={(value) => {
            if (!value) {
              setValue(undefined);
            } else {
              setValue({ entityId: value });
            }

            void validate();
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Field" />
          </SelectTrigger>
          <SelectContent>
            {items.length ? (
              items.map(([id, item]) => (
                <SelectItem key={id} value={id}>
                  {item.attributes.label}
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

const labelComponent = createAttributeComponent(
  labelAttribute,
  ({ attribute, setValue, validate, resetError }) => {
    return (
      <div>
        Label
        <input
          value={attribute.value ?? ""}
          onChange={(e) => {
            setValue(e.target.value);

            void validate();
          }}
        />
        <Button onClick={() => resetError()}>reset</Button>
        <span style={{ color: "red" }}>
          {typeof attribute.error === "string"
            ? attribute.error
            : JSON.stringify(attribute.error)}
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

const FormBuilderStoreContext = createContext<{
  builderStore: BuilderStore<typeof formBuilder>;
}>({
  builderStore: createBuilderStore({ builder: formBuilder }),
});

export default function Page() {
  const builderStore = useBuilderStore(formBuilder, {
    events: {
      onEntityDeleted(payload) {
        Object.entries(builderStore.getData().schema.entities).forEach(
          ([id, entity]) => {
            if (
              "visibleWhen" in entity.attributes &&
              entity.attributes.visibleWhen?.entityId === payload.entity.id
            ) {
              builderStore.setEntityAttribute(id, "visibleWhen", undefined);
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

  const builderStoreData = useBuilderStoreData(builderStore, (events) =>
    events.some((event) => event.name === "RootUpdated"),
  );

  const [isPending, startTransition] = useTransition();

  const interpreterStore = useInterpreterStore(formBuilder, {
    entities: {
      "98220f11-9ebc-46b8-b1d7-abd16f90841c": {
        type: "text",
        attributes: {
          label: "1",
        },
      },
      "414e1304-d22e-4337-94b9-6821a1dd01e0": {
        type: "text",
        attributes: {
          label: "2",
        },
      },
    },
    root: [
      "98220f11-9ebc-46b8-b1d7-abd16f90841c",
      "414e1304-d22e-4337-94b9-6821a1dd01e0",
    ],
  });

  return (
    <>
      <button
        onClick={() => {
          builderStore.addEntity({
            type: "text",
            attributes: {
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
            components={{
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
        <FormBuilderStoreContext.Provider
          value={{
            builderStore,
          }}
        >
          <Builder.Attributes
            builderStore={builderStore}
            entityId={selectedEntityId}
            components={{
              text: {
                label: labelComponent,
                visibleWhen: visibleWhenComponent,
              },
            }}
          />
        </FormBuilderStoreContext.Provider>
      ) : null}
      <div className="text-3xl">test</div>
      <button
        onClick={() => {
          startTransition(async () => {
            builderStore.resetEntitiesAttributesErrors();

            const res = await validateForm(builderStore.getData().schema);

            if (
              !res.success &&
              res.reason.code ===
                schemaValidationErrorCodes.InvalidEntitiesAttributes
            ) {
              builderStore.setEntitiesAttributesErrors(
                res.reason.payload.entitiesAttributesErrors,
              );

              const firstEntityWithErrors = Object.keys(
                res.reason.payload.entitiesAttributesErrors,
              )[0];

              if (
                selectedEntityId &&
                res.reason.payload.entitiesAttributesErrors[selectedEntityId]
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
      <button
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick={async () => {
          builderStore.resetEntitiesAttributesErrors();

          const res = await validateSubmission(
            interpreterStore.getData().entitiesValues,
            interpreterStore.schema,
          );

          console.log(res);
        }}
      >
        SUBMIT
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
      <Interpreter
        interpreterStore={interpreterStore}
        components={{
          text: textComponent,
        }}
      />
    </>
  );
}
