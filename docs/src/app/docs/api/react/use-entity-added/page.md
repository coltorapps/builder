---
title: useEntityAdded
nextjs:
  metadata:
    title: useEntityAdded
    description: API Reference of useEntityAdded.
---

The `useEntityAdded` hook calls the provided callback whenever a new entity is added to the given [builder store's](/docs/api/react/use-builder-store) schema.

## Reference

### `useEntityAdded(builderStore, callback)` {% class="break-all" %}

```tsx
import { useBuilderStore, useEntityAdded } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  useEntityAdded(builderStore, (entity) => {
    console.log("Entity added:", entity);
  });

  return null;
}
```

### Parameters

`useEntityAdded` accepts two parameters:

| Parameter      | Type                            | Description {% class="api-description" %}                                    |
| -------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| `builderStore` | {% badge content="object" /%}   | The [builder store](/docs/api/react/use-builder-store) instance to monitor.  |
| `callback`     | {% badge content="function" /%} | A function called whenever a new entity is added. Receives the added entity. |

### Returns

This hook does not return a value. It registers a side effect that triggers the provided callback whenever an entity is added to the store.
