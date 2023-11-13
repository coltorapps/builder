"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { DndContext, DragOverlay, MouseSensor, useSensor } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createBuilder, type BuilderStore, type Schema } from "basebuilder";
import {
  AlertCircle,
  CheckCircle2,
  EyeIcon,
  InfoIcon,
  XIcon,
} from "lucide-react";

import {
  Builder,
  Interpreter,
  useBuilderStore,
  useBuilderStoreData,
  useInterpreterStore,
} from "@basebuilder/react";

import { ContentAttribute } from "./attributes/content-attribute";
import { DefaultDateValueAttribute } from "./attributes/default-date-value-attribute";
import { DefaultStringValueAttribute } from "./attributes/default-string-value-attribute";
import { LabelAttribute } from "./attributes/label-attribute";
import { OptionsAttribute } from "./attributes/options-attribute";
import { PlaceholderAttribute } from "./attributes/placeholder-attribute";
import { RequiredAttribute } from "./attributes/required-attribute";
import {
  DatePickerFieldEntity,
  datePickerFieldEntity,
} from "./entities/date-picker-entity";
import { ParagraphEntity, paragraphEntity } from "./entities/paragraph-entity";
import {
  SelectFieldEntity,
  selectFieldEntity,
} from "./entities/select-field-entity";
import { TextFieldEntity, textFieldEntity } from "./entities/text-field-entity";
import {
  TextareaFieldEntity,
  textareaFieldEntity,
} from "./entities/textarea-field-entity";

export const basicFormBuilder = createBuilder({
  entities: [
    textFieldEntity,
    textareaFieldEntity,
    selectFieldEntity,
    datePickerFieldEntity,
    paragraphEntity,
  ],
});

const initialSchema = {
  entities: {
    "a68836dc-1478-435f-bdee-ca7aff098993": {
      type: "textField",
      attributes: {
        label: "First Name",
        required: true,
      },
    },
    "18950fc8-81f6-4927-91c0-880c36a56deb": {
      type: "textField",
      attributes: {
        label: "Last Name",
        required: true,
      },
    },
    "39ea99a0-9f37-4446-9376-d93d6d7c35c5": {
      type: "textareaField",
      attributes: {
        label: "About You",
      },
    },
  },
  root: [
    "a68836dc-1478-435f-bdee-ca7aff098993",
    "18950fc8-81f6-4927-91c0-880c36a56deb",
    "39ea99a0-9f37-4446-9376-d93d6d7c35c5",
  ],
} as const;

function SortableItem(props: { id: string; children: ReactNode }) {
  const {
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    setNodeRef,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn({
        "z-50": isDragging,
      })}
      aria-describedby="dnd"
    >
      {props.children}
    </div>
  );
}

function Preview(props: {
  builderStore: BuilderStore<typeof basicFormBuilder>;
  activeEntityId: string;
  onShouldFocusEntity: (id: string) => void;
}) {
  const { toast } = useToast();

  const [previewVisible, setPreviewVisible] = useState(false);

  const [schema, setSchema] = useState<Schema<typeof basicFormBuilder>>();

  const interpreterStore = useInterpreterStore(
    basicFormBuilder,
    schema ?? { entities: {}, root: [] },
  );

  async function openPreview() {
    const result = await props.builderStore.validateSchema();

    if (result.success) {
      setPreviewVisible(true);

      setSchema(result.data);

      return;
    }

    if (
      result.reason.code === "InvalidEntitiesAttributes" &&
      !result.reason.payload.entitiesAttributesErrors[props.activeEntityId]
    ) {
      props.onShouldFocusEntity(
        Object.keys(result.reason.payload.entitiesAttributesErrors)[0],
      );
    }

    toast({
      title: (
        <span>
          <AlertCircle className="mr-2 inline text-red-500" /> Please fix the
          highlighted errors.
        </span>
      ),
    });
  }

  async function handleSubmit() {
    const result = await interpreterStore.validateEntities();

    if (result.success) {
      setPreviewVisible(false);

      toast({
        title: (
          <span>
            <CheckCircle2 className="mr-2 inline text-green-500" /> Submission
            successful.
          </span>
        ),
      });
    }
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={() => void openPreview()}>
        <EyeIcon className="mr-2 h-4 w-4" />
        Preview Form
      </Button>
      <Dialog modal open={previewVisible} onOpenChange={setPreviewVisible}>
        <DialogContent className="sm:top-[20%] sm:translate-y-0">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="w-full">
              <div className="my-px grid w-full grid-cols-2">
                <TabsTrigger value="form">Form</TabsTrigger>
                <TabsTrigger value="schema">Schema</TabsTrigger>
              </div>
            </TabsList>
            <TabsContent value="form">
              <ScrollArea className="max-h-96 overflow-auto ">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();

                    void handleSubmit();
                  }}
                  className="-mx-1 grid gap-4 px-2 py-4"
                  noValidate
                >
                  <Interpreter
                    interpreterStore={interpreterStore}
                    components={{
                      textField: TextFieldEntity,
                      selectField: SelectFieldEntity,
                      datePickerField: DatePickerFieldEntity,
                      textareaField: TextareaFieldEntity,
                      paragraph: ParagraphEntity,
                    }}
                  />
                  <div className="flex justify-end">
                    <Button type="submit">Submit</Button>
                  </div>
                </form>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="schema">
              <Card>
                <CardContent className="max-h-96 overflow-auto py-4">
                  <pre className="w-1 text-xs">
                    {JSON.stringify(schema, undefined, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddElementButton(props: { onClick: () => void; children: ReactNode }) {
  return (
    <DialogClose asChild>
      <Button
        variant="outline"
        className="mr-2"
        onClick={() =>
          // The auto-focus on attributes is triggered only after the modal has been hidden.
          setTimeout(() => {
            props.onClick();
          }, 200)
        }
      >
        {props.children}
      </Button>
    </DialogClose>
  );
}

function TextFieldAttributes() {
  return (
    <>
      <LabelAttribute />
      <DefaultStringValueAttribute />
      <PlaceholderAttribute />
      <RequiredAttribute />
    </>
  );
}

function SelectFieldAttributes() {
  return (
    <>
      <LabelAttribute />
      <PlaceholderAttribute />
      <RequiredAttribute />
      <OptionsAttribute />
    </>
  );
}

function DatePickerFieldAttributes() {
  return (
    <>
      <LabelAttribute />
      <RequiredAttribute />
      <DefaultDateValueAttribute />
    </>
  );
}

function ParagraphAttributes() {
  return <ContentAttribute />;
}

function Entity(props: {
  entityId: string;
  children: ReactNode;
  isActive: boolean;
  onFocus?: () => void;
  onDelete?: () => void;
  builderStore: BuilderStore;
}) {
  const { entitiesAttributesErrors } = useBuilderStoreData(
    props.builderStore,
    (events) =>
      events.some(
        (event) =>
          (event.name === "EntityAttributeErrorUpdated" &&
            event.payload.entity.id === props.entityId) ||
          event.name === "DataSet",
      ),
  );

  return (
    <div className="relative">
      <div className="absolute inset-0 -mx-2 -mb-4 -mt-2 rounded-xl bg-neutral-950 sm:-mx-4" />
      <div
        className="pointer-events-none relative"
        tabIndex={-1}
        onFocusCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {props.children}
      </div>
      <button
        type="button"
        className={cn(
          "absolute inset-0 -mx-2 -mb-4 -mt-2 rounded-xl border-2 transition-all sm:-mx-4",
          props.isActive
            ? "border-white"
            : "border-transparent hover:border-white/30",
          {
            "border-destructive":
              !props.isActive && entitiesAttributesErrors[props.entityId],
          },
        )}
        onPointerDown={props.onFocus}
      />
      {props.isActive ? (
        <button
          type="button"
          className="absolute -right-3 -top-4 flex h-5 w-5 items-center justify-center rounded-full bg-white sm:-right-6"
          onClick={props.onDelete}
        >
          <XIcon className="w-3 text-black" />
        </button>
      ) : null}
    </div>
  );
}

export function BasicFormBuilder() {
  const builderStore = useBuilderStore(basicFormBuilder, {
    events: {
      onEntityAdded(payload) {
        setActiveEntityId(payload.entity.id);
      },
      onEntityCloned(payload) {
        setActiveEntityId(payload.entityClone.id);
      },
      onEntityDeleted(payload) {
        if (payload.entity.id === activeEntityId) {
          setActiveEntityId(builderStore.getData().schema.root[0]);
        }
      },
    },
    initialData: {
      schema: initialSchema,
    },
  });

  const [activeEntityId, setActiveEntityId] = useState(
    builderStore.getData().schema.root[0],
  );

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const rootEntities = useBuilderStoreData(builderStore, (events) =>
    events.some(
      (event) => event.name === "RootUpdated" || event.name === "DataSet",
    ),
  ).schema.root;

  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div>
      {rootEntities.length ? (
        <div className="flex justify-end">
          <Preview
            builderStore={builderStore}
            activeEntityId={activeEntityId}
            onShouldFocusEntity={setActiveEntityId}
          />
        </div>
      ) : null}
      <div
        className={cn("grid", {
          "mt-6 gap-8 sm:grid-cols-2": rootEntities.length,
        })}
      >
        {!rootEntities.length ? (
          <div className="mt-4 grid gap-2 text-center">
            <InfoIcon className="mx-auto h-8 w-8 text-neutral-600" />
            <span>No elements yet.</span>
          </div>
        ) : null}
        <div>
          <div className="grid gap-8">
            <div className="grid gap-8">
              <DndContext
                id="dnd"
                sensors={[mouseSensor]}
                onDragStart={(e) => {
                  if (typeof e.active.id === "string") {
                    setDraggingId(e.active.id);
                  }
                }}
                onDragEnd={(e) => {
                  const overId = e.over?.id;

                  setDraggingId(null);

                  if (!overId || typeof e.active.id !== "string") {
                    return;
                  }

                  const index = rootEntities.findIndex((id) => id === overId);

                  builderStore.setEntityIndex(e.active.id, index);
                }}
              >
                <SortableContext
                  id="sortable"
                  items={[...rootEntities]}
                  strategy={verticalListSortingStrategy}
                >
                  <Builder.Entities
                    builderStore={builderStore}
                    components={{
                      textField: TextFieldEntity,
                      selectField: SelectFieldEntity,
                      datePickerField: DatePickerFieldEntity,
                      textareaField: TextareaFieldEntity,
                      paragraph: ParagraphEntity,
                    }}
                  >
                    {(props) => {
                      return (
                        <SortableItem id={props.entity.id}>
                          <Entity
                            builderStore={builderStore}
                            entityId={props.entity.id}
                            isActive={
                              activeEntityId === props.entity.id &&
                              draggingId !== props.entity.id
                            }
                            onFocus={() => setActiveEntityId(props.entity.id)}
                            onDelete={() =>
                              builderStore.deleteEntity(props.entity.id)
                            }
                          >
                            {props.children}
                          </Entity>
                        </SortableItem>
                      );
                    }}
                  </Builder.Entities>
                </SortableContext>
                <DragOverlay>
                  {draggingId ? (
                    <Builder.Entities
                      builderStore={builderStore}
                      components={{
                        textField: TextFieldEntity,
                        selectField: SelectFieldEntity,
                        datePickerField: DatePickerFieldEntity,
                        textareaField: TextareaFieldEntity,
                        paragraph: ParagraphEntity,
                      }}
                    >
                      {(props) =>
                        props.entity.id === draggingId ? (
                          <Entity
                            isActive
                            builderStore={builderStore}
                            entityId={props.entity.id}
                          >
                            {props.children}
                          </Entity>
                        ) : null
                      }
                    </Builder.Entities>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
            <Dialog modal>
              <div className="flex justify-center">
                <DialogTrigger asChild>
                  <Button
                    className={cn("w-full", {
                      "max-w-xs": !activeEntityId,
                    })}
                  >
                    Add Element
                  </Button>
                </DialogTrigger>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New element</DialogTitle>
                  <DialogDescription>Choose an element type.</DialogDescription>
                  <div className="space-y-2">
                    <AddElementButton
                      onClick={() =>
                        builderStore.addEntity({
                          type: "textField",
                          attributes: {
                            label: "Text Field",
                          },
                        })
                      }
                    >
                      Text Field
                    </AddElementButton>
                    <AddElementButton
                      onClick={() =>
                        builderStore.addEntity({
                          type: "textareaField",
                          attributes: {
                            label: "Textarea Field",
                          },
                        })
                      }
                    >
                      Textarea Field
                    </AddElementButton>
                    <AddElementButton
                      onClick={() =>
                        builderStore.addEntity({
                          type: "selectField",
                          attributes: {
                            label: "Select Field",
                            options: [],
                          },
                        })
                      }
                    >
                      Select Field
                    </AddElementButton>
                    <AddElementButton
                      onClick={() =>
                        builderStore.addEntity({
                          type: "datePickerField",
                          attributes: {
                            label: "Date Picker Field",
                          },
                        })
                      }
                    >
                      Date Picker Field
                    </AddElementButton>
                    <AddElementButton
                      onClick={() =>
                        builderStore.addEntity({
                          type: "paragraph",
                          attributes: {
                            content: {
                              text: "",
                            },
                          },
                        })
                      }
                    >
                      Paragraph
                    </AddElementButton>
                  </div>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {activeEntityId ? (
          <div className="rounded-xl border-l bg-neutral-900/50 p-4 pb-8">
            <div className="sticky top-24 grid gap-8">
              <Builder.Attributes
                entityId={activeEntityId}
                builderStore={builderStore}
                components={{
                  textField: TextFieldAttributes,
                  textareaField: TextFieldAttributes,
                  selectField: SelectFieldAttributes,
                  datePickerField: DatePickerFieldAttributes,
                  paragraph: ParagraphAttributes,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
