---
title: useBuilderStoreData
nextjs:
  metadata:
    title: useBuilderStoreData
    description: API Reference of useBuilderStoreData.
---

This React hook accepts a [builder store](/docs/api/react/use-builder-store), listens for data updates, and returns the latest data. Each data update triggers a re-render. You can optionally provide a custom selector as the second argument to gain fine-grained control over re-renders and data selection.

## Reference

### `useBuilderStoreData(builderStore, selector?, comparator?)` {% class="break-all" %}

Use the `useBuilderStoreData` function to subscribe to the [builder store's](/docs/api/react/use-builder-store) data updates and retrieve the data.

```typescript
import {
  useBuilderStore,
  useBuilderStoreData,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  const data = useBuilderStoreData(builderStore);
}
```

### Parameters

`useBuilderStoreData` accepts two parameters:

| Parameter      | Type                                                            | Description {% class="api-description" %}                                                                                                                          |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `builderStore` | {% badge content="object" /%}                                   | The [builder store](/docs/api/react/use-builder-store).                                                                                                            |
| `selector`     | {% badge content="function" /%} {% badge content="optional" /%} | An optional selector function for extracting specific data from the store. Defaults to `(data) => data`                                                            |
| `comparator`   | {% badge content="function" /%} {% badge content="optional" /%} | An optional comparator function used to determine whether the selected data should trigger an update and re-render. Defaults to the built-in `shallow` comparator. |

### Returns

The `useBuilderStoreData` function returns the selected portion of the [builder store's data](/docs/api/create-builder-store#data) using the provided `selector`, and triggers a re-render only when the `comparator` returns `false`.
