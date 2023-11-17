"use client";

import { useState, type ReactNode } from "react";
import { DndContainer, DndItem } from "@/components/dnd";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type BuilderStore } from "basebuilder";
import { InfoIcon, XIcon } from "lucide-react";

import {
  Builder,
  useBuilderStore,
  useBuilderStoreData,
} from "@basebuilder/react";

import { DatePickerFieldAttributes } from "../entities/date-picker/attributes-component";
import { DatePickerFieldEntity } from "../entities/date-picker/component";
import { ParagraphAttributes } from "../entities/paragraph/attributes-component";
import { ParagraphEntity } from "../entities/paragraph/component";
import { SelectFieldAttributes } from "../entities/select-field/attributes-component";
import { SelectFieldEntity } from "../entities/select-field/component";
import { TextFieldAttributes } from "../entities/text-field/attributes-component";
import { TextFieldEntity } from "../entities/text-field/component";
import { TextareaFieldAttributes } from "../entities/textarea-field/attributes-component";
import { TextareaFieldEntity } from "../entities/textarea-field/component";
import { basicFormBuilder } from "./definition";
import { initialSchema } from "./initial-schema";
import { Preview } from "./preview";

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

function Entity(props: {
  entityId: string;
  children: ReactNode;
  isActive: boolean;
  isDragging: boolean;
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
              !props.isActive &&
              entitiesAttributesErrors[props.entityId] &&
              !props.isDragging,
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

const entitiesComponents = {
  textField: TextFieldEntity,
  selectField: SelectFieldEntity,
  datePickerField: DatePickerFieldEntity,
  textareaField: TextareaFieldEntity,
  paragraph: ParagraphEntity,
};

const entitiesAttributesComponents = {
  textField: TextFieldAttributes,
  textareaField: TextareaFieldAttributes,
  selectField: SelectFieldAttributes,
  datePickerField: DatePickerFieldAttributes,
  paragraph: ParagraphAttributes,
};

export function BasicFormBuilder() {
  const builderStore = useBuilderStore(basicFormBuilder, {
    events: {
      onEntityAdded(payload) {
        setActiveEntityId(payload.entity.id);
      },
      onEntityDeleted(payload) {
        const rootEntityId = builderStore.getData().schema.root[0];

        if (payload.entity.id === activeEntityId && rootEntityId) {
          setActiveEntityId(rootEntityId);
        } else {
          setActiveEntityId(null);
        }
      },
    },
    initialData: {
      schema: initialSchema,
    },
  });

  const [activeEntityId, setActiveEntityId] = useState<string | null>(
    builderStore.getData().schema.root[0],
  );

  const {
    schema: { root },
  } = useBuilderStoreData(builderStore, (events) =>
    events.some(
      (event) => event.name === "RootUpdated" || event.name === "DataSet",
    ),
  );

  return (
    <div>
      {root.length ? (
        <div className="flex justify-end">
          <Preview
            builderStore={builderStore}
            activeEntityId={activeEntityId}
            onEntityError={(entityId) => {
              if (builderStore.getSchema().entities[entityId]) {
                setActiveEntityId(entityId);
              }
            }}
          />
        </div>
      ) : null}
      <div
        className={cn("grid", {
          "mt-6 gap-8 sm:grid-cols-2": root.length,
        })}
      >
        {!root.length ? (
          <div className="mt-4 grid gap-2 text-center">
            <InfoIcon className="mx-auto h-8 w-8 text-neutral-600" />
            <span>No elements yet.</span>
          </div>
        ) : null}
        <div>
          <div className="grid gap-8">
            <div className="grid gap-8">
              <DndContainer
                builderStore={builderStore}
                dragOverlay={({ draggingId }) => (
                  <Builder.Entities
                    builderStore={builderStore}
                    components={entitiesComponents}
                  >
                    {(props) =>
                      props.entity.id === draggingId ? (
                        <Entity
                          isActive
                          isDragging
                          builderStore={builderStore}
                          entityId={props.entity.id}
                        >
                          {props.children}
                        </Entity>
                      ) : null
                    }
                  </Builder.Entities>
                )}
              >
                {({ draggingId }) => (
                  <Builder.Entities
                    builderStore={builderStore}
                    components={entitiesComponents}
                  >
                    {(props) => (
                      <DndItem id={props.entity.id}>
                        <Entity
                          builderStore={builderStore}
                          entityId={props.entity.id}
                          isActive={
                            activeEntityId === props.entity.id &&
                            draggingId !== props.entity.id
                          }
                          isDragging={draggingId === props.entity.id}
                          onFocus={() => setActiveEntityId(props.entity.id)}
                          onDelete={() =>
                            builderStore.deleteEntity(props.entity.id)
                          }
                        >
                          {props.children}
                        </Entity>
                      </DndItem>
                    )}
                  </Builder.Entities>
                )}
              </DndContainer>
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
          <div className="rounded-xl border-l bg-neutral-900/60 p-4 pb-8">
            <div className="sticky top-24 grid gap-8">
              <Builder.Attributes
                entityId={activeEntityId}
                builderStore={builderStore}
                components={entitiesAttributesComponents}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
