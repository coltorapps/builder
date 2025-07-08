---
title: useEntityDeleted
nextjs:
  metadata:
    title: useEntityDeleted
    description: API Reference of useEntityDeleted.
---

The `useEntityDeleted` hook calls the provided callback whenever an entity is deleted from the given [builder store's](/docs/api/react/use-builder-store) schema.

## Reference

### `useEntityDeleted(builderStore, callback)` {% class="break-all" %}

```tsx
import { useBuilderStore, useEntityDeleted } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  useEntityDeleted(builderStore, (entity) => {
    console.log("Entity deleted:", entity);
  });

  return null;
}
```

### Parameters

`useEntityDeleted` accepts two parameters:

| Parameter      | Type                            | Description {% class="api-description" %}                                     |
| -------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `builderStore` | {% badge content="object" /%}   | The [builder store](/docs/api/react/use-builder-store) instance to monitor.   |
| `callback`     | {% badge content="function" /%} | A function called whenever an entity is deleted. Receives the deleted entity. |

### Returns

This hook does not return a value. It registers a side effect that triggers the provided callback whenever an entity is deleted from the store.
