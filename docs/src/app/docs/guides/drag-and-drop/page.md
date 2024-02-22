---
title: Drag & Drop
nextjs:
  metadata:
    title: Drag & Drop
    description: Drag and drop guide
---

## About this guide

This short guide will demonstrate how you can make use of specific builder store methods for seamless integration with any drag-and-drop library. Specifically, we're going to use [`dnd kit`](https://dndkit.com/) for illustrative purposes.

Please note that this guide focuses on drag-and-drop functionality within a single hierarchical level to maintain simplicity.

## Implementing drag & drop

First, let's define a component that will be used to wrap each arbitrary entity and make it draggable.

```tsx
import { type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function DndItem(props: { id: string; children: ReactNode }) {
  const { attributes, listeners, transform, transition, setNodeRef } =
    useSortable({ id: props.id });

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
      aria-describedby="dnd"
    >
      {props.children}
    </div>
  );
}
```

The builder store exposes a set of useful methods, such as `setEntityIndex`, to change the order of entities. For example, you can invoke this method when an entity has been dropped, and you have calculated its new desired index.

```tsx
import {
  DndContext,
  MouseSensor,
  useSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  BuilderEntities,
  useBuilderStore,
  useBuilderStoreData,
} from "@coltorapps/builder-react";

import {
  DatePickerFieldEntity,
  DndItem,
  SelectFieldEntity,
  TextFieldEntity,
} from "./components";
import { formBuilder } from "./form-builder";

export function FormBuilder() {
  const builderStore = useBuilderStore(formBuilder);

  /*
  | We retrieve the `root` from the store's schema, which is
  | an array that holds the top-level entities IDs in the
  | hierarchy, determining their order.
  |
  | Note that we want for the output to refresh and
  | trigger a re-render only when the store emits the
  | `RootUpdated` event, signifying that the `root`
  | has been updated.
  */
  const {
    schema: { root },
  } = useBuilderStoreData(builderStore, (events) =>
    events.some((event) => event.name === "RootUpdated"),
  );

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  function handleDragEnd(e: DragEndEvent) {
    const overId = e.over?.id;

    if (!overId || typeof e.active.id !== "string") {
      return;
    }

    const index = root.findIndex((id) => id === overId);

    /*
    | When an entity is dropped, we can move it
    | to a new index on its hierarchical level.
    */
    builderStore.setEntityIndex(e.active.id, index);
  }

  return (
    <DndContext id="dnd" sensors={[mouseSensor]} onDragEnd={handleDragEnd}>
      <SortableContext
        id="sortable"
        items={Array.from(root)}
        strategy={verticalListSortingStrategy}
      >
        <BuilderEntities
          builderStore={builderStore}
          components={{
            textField: TextFieldEntity,
            selectField: SelectFieldEntity,
            datePickerField: DatePickerFieldEntity,
          }}
        >
          {/*
          | We wrap each rendered entity with our `DndItem`
          | component to make it draggable.
          */}
          {(props) => <DndItem id={props.entity.id}>{props.children}</DndItem>}
        </BuilderEntities>
      </SortableContext>
    </DndContext>
  );
}
```

It's worth noting that all of the following methods accept an index for adjusting an entity's order: `setEntityIndex`, `addEntity`, `setEntityParent`, and `unsetEntityParent`.

For instance, when creating entities by dragging placeholders from a sidebar, you can utilize the `index` option in the `addEntity` method to position them where the user dropped the placeholder. Similarly, when moving an entity between different levels or sections, you can make use of the `index` option in the `setEntityParent` and `unsetEntityParent` methods.
