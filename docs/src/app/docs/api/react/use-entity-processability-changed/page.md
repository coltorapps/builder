---
title: useEntityProcessabilityChanged
nextjs:
  metadata:
    title: useEntityProcessabilityChanged
    description: API Reference of useEntityProcessabilityChanged.
---

The `useEntityProcessabilityChanged` hook calls the provided callback whenever [the processability of an entity](/docs/entities#conditional-processing) changes in the given [interpreter store](/docs/api/react/use-interpreter-store).

## Reference

### `useEntityProcessabilityChanged(interpreterStore, callback)` {% class="break-all" %}

```tsx
import {
  useEntityProcessabilityChanged,
  useInterpreterStore,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  useEntityProcessabilityChanged(interpreterStore, (entity) => {
    console.log(
      `Entity ${entity.id} processability changed`,
      "from",
      entity.prevProcessable,
      "to",
      entity.processable,
    );
  });

  return null;
}
```

### Parameters

`useEntityProcessabilityChanged` accepts two parameters:

| Parameter          | Type                            | Description {% class="api-description" %}                                                                                                  |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `interpreterStore` | {% badge content="object" /%}   | The [interpreter store](/docs/api/react/use-interpreter-store) instance to monitor.                                                        |
| `callback`         | {% badge content="function" /%} | A function called whenever an entity's processability changes. Receives the updated entity, including `processable` and `prevProcessable`. |

### Returns

This hook does not return a value. It registers a side effect that triggers the provided callback whenever an entity's processability changes in the interpreter store.
