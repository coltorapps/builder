---
title: useInterpreterStoreData
nextjs:
  metadata:
    title: useInterpreterStoreData
    description: API Reference of useInterpreterStoreData.
---

This React hook accepts an [interpreter store](/docs/api/react/use-interpreter-store) and returns its current data. It allows fine-grained control over when to refresh its output and trigger a rerender.

## Reference

### `useInterpreterStoreData(interpreterStore, shouldUpdate?)`

Use the `useInterpreterStoreData` function to get the [interpreter store's](/docs/api/use-interpreter-store) data and automatically trigger rerenders when mutation events are emitted by the store.

```typescript
import {
  useInterpreterStore,
  useInterpreterStoreData,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";

const formSchema = {
  entities: {
    "51324b32-adc3-4d17-a90e-66b5453935bd": {
      type: "textField",
      attributes: {
        label: "First name",
      },
    },
  },
  root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
};

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  const data = useInterpreterStoreData(interpreterStore);
}
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.

### Parameters

`useInterpreterStoreData` accepts two parameters:

| Parameter          | Type                                                            | Description {% class="api-description" %}                                                                                                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `interpreterStore` | {% badge content="object" /%}                                   | The [interpreter store](/docs/api/react/use-interpreter-store).                                                                                                                                                                                                                                                    |
| `shouldUpdate`     | {% badge content="function" /%} {% badge content="optional" /%} | An optional function that must return a boolean to determine whether or not to trigger a rerender. It receives an array of [events](/docs/api/create-interpreter-store#events) emitted by the store after a mutation. Defaults to `() => true`, meaning it will trigger rerenders on each data changes by default. |

### Returns

The `useInterpreterStoreData` function essentially returns a snapshot of the [interpreter store's data](/docs/api/create-interpreter-store#data) based on the last time the `shouldUpdate` function has returned `true`.
