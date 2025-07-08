---
title: Virtualization
nextjs:
  metadata:
    title: Virtualization
    description: Virtualization guide
---

## About this guide

Virtualization is a technique for rendering very long lists efficiently. This short guide demonstrates how to virtualize both root-level entities and the children of parent entities.

For demonstration purposes, we'll use [TanStack Virtual](https://tanstack.com/virtual/v3/).

## Virtualizing root entities

If you expect a large number of entities rendered at the root level, it’s a good idea to virtualize the list.

```tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import {
  BuilderEntity,
  useBuilderStore,
  useBuilderStoreData,
} from "@coltorapps/builder-react";

import { BuilderTextFieldEntity } from "./components";
import { formBuilder } from "./form-builder";

const components = { textField: BuilderTextFieldEntity };

export default function FormBuilderPage() {
  const builderStore = useBuilderStore(formBuilder);

  const rootIds = useBuilderStoreData(builderStore, (data) => data.schema.root);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rootIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map((virtualRow) =>
        rootIds[virtualRow.index] ? (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
          >
            <BuilderEntity
              entityId={rootIds[virtualRow.index]}
              builderStore={builderStore}
              components={components}
            />
          </div>
        ) : null,
      )}
    </div>
  );
}
```

We retrieve the array of root entity IDs from the builder store’s schema by using `useBuilderStoreData` with a custom selector: `(data) => data.schema.root`.

Note how instead of using `<BuilderEntities />`, we're using `<BuilderEntity />` and implementing the render loop manually.

## Virtualizing child entities

If a section entity contains a very long list of children, those can be virtualized as well.

```tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { type BuilderEntityComponentProps } from "@coltorapps/builder-react";

import { type sectionEntity } from "./entities";
import { type formBuilder } from "./form-builder";

export function BuilderSectionEntity(
  props: BuilderEntityComponentProps<typeof sectionEntity, typeof formBuilder>,
) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: props.entity.children,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map((virtualRow) =>
        props.entity.children[virtualRow.index] ? (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
          >
            <props.RenderChild
              entityId={props.entity.children[virtualRow.index]}
              builderStore={builderStore}
              components={components}
            />
          </div>
        ) : null,
      )}
    </div>
  );
}
```

Note that instead of using `<props.RenderChildren />`, we're using `<props.RenderChild />` and implementing the render loop manually.
