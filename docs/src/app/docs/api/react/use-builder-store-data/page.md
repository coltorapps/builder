---
title: useBuilderStoreData
nextjs:
  metadata:
    title: useBuilderStoreData
    description: API Reference of useBuilderStoreData.
---

This React hook accepts a [builder store](/docs/api/react/use-builder-store) and returns its current data. It allows fine-grained control over when to refresh its output and trigger a rerender.

## Reference

### `useBuilderStoreData(builderStore, shouldUpdate?)`

Use the `useBuilderStoreData` function to get the [builder store's](/docs/api/react/use-builder-store) data and automatically trigger rerenders when mutation events are emitted by the store.

```typescript
import { useBuilderStore, useBuilderStoreData } from "@basebuilder/react";

import { formBuilder } from "./form-builder";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  const data = useBuilderStoreData(builderStore);
}
```

### Parameters

`useBuilderStoreData` accepts two parameters:

| Parameter      | Type                                                            | Description                                                                                                                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `builderStore` | {% badge content="object" /%}                                   | The [builder store](/docs/api/react/use-builder-store).                                                                                                                                                                                                                                                           |
| `shouldUpdate` | {% badge content="function" /%} {% badge content="optional" /%} | An optional function that must return a boolean to determine whether or not to trigger a rerender. It receives an array of [events](/docs/api/create-builder-store#events) emitted by the store after a mutation. Defaults to `() => true`, meaning it will trigger rerenders on each data changes by default. |

### Returns

The `useBuilderStoreData` function essentially returns a snapshot of the [builder store's data](/docs/api/create-builder-store#data) based on the last time the `shouldUpdate` function has returned `true`.
