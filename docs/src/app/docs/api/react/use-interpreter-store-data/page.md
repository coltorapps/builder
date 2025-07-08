---
title: useInterpreterStoreData
nextjs:
  metadata:
    title: useInterpreterStoreData
    description: API Reference of useInterpreterStoreData.
---

This React hook accepts a [interpreter store](/docs/api/react/use-interpreter-store), listens for data updates, and returns the latest data. Each data update triggers a re-render. You can optionally provide a custom selector as the second argument to gain fine-grained control over re-renders and data selection.

## Reference

### `useInterpreterStoreData(interpreterStore, selector?, comparator?)` {% class="break-all" %}

Use the `useInterpreterStoreData` function to subscribe to the [interpreter store's](/docs/api/react/use-interpreter-store) data updates and retrieve the data.

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

In the example above, we've hardcoded the schema, but typically, you would fetch it from some data source, for instance.

### Parameters

`useInterpreterStoreData` accepts two parameters:

| Parameter          | Type                                                            | Description {% class="api-description" %}                                                                                                                          |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `interpreterStore` | {% badge content="object" /%}                                   | The [interpreter store](/docs/api/react/use-interpreter-store).                                                                                                    |
| `selector`         | {% badge content="function" /%} {% badge content="optional" /%} | An optional selector function for extracting specific data from the store. Defaults to `(data) => data`                                                            |
| `comparator`       | {% badge content="function" /%} {% badge content="optional" /%} | An optional comparator function used to determine whether the selected data should trigger an update and re-render. Defaults to the built-in `shallow` comparator. |

### Returns

The `useInterpreterStoreData` function returns the selected portion of the [interpreter store's data](/docs/api/create-interpreter-store#data) using the provided `selector`, and triggers a re-render only when the `comparator` returns `false`.
