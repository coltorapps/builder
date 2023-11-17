import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DndContext, DragOverlay, MouseSensor, useSensor } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type BuilderStore } from "basebuilder";

import { useBuilderStoreData } from "@basebuilder/react";

export function DndItem(props: { id: string; children: ReactNode }) {
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

export function DndContainer(props: {
  builderStore: BuilderStore;
  dragOverlay: (props: { draggingId?: string | null }) => ReactNode;
  children: (props: { draggingId?: string | null }) => ReactNode;
}) {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const rootEntities = useBuilderStoreData(props.builderStore, (events) =>
    events.some(
      (event) => event.name === "RootUpdated" || event.name === "DataSet",
    ),
  ).schema.root;

  return (
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

        props.builderStore.setEntityIndex(e.active.id, index);
      }}
    >
      <SortableContext
        id="sortable"
        items={[...rootEntities]}
        strategy={verticalListSortingStrategy}
      >
        {props.children({
          draggingId,
        })}
      </SortableContext>
      <DragOverlay>
        {draggingId ? props.dragOverlay({ draggingId }) : null}
      </DragOverlay>
    </DndContext>
  );
}
