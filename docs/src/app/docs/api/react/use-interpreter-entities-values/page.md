---
title: useInterpreterEntitiesValues
nextjs:
  metadata:
    title: useInterpreterEntitiesValues
    description: API Reference of useInterpreterEntitiesValues.
---

This React hook retrieves the values of all entities or the selected ones from an [interpreter store](/docs/api/use-interpreter-store).

## Reference

### `useInterpreterEntitiesValues(entitiesIds?)`

Use the `useInterpreterEntitiesValues` function to retrieve the values of all entities or the selected ones.

```tsx
import { useInterpreterStore } from "@coltorapps/builder-react";

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

  const entitiesValues = useInterpreterEntitiesValues(interpreterStore);
}
```

### Parameters

`useInterpreterEntitiesValues` accepts two parameters:

| Parameter          | Type                                                         | Description {% class="api-description" %}                       |
| ------------------ | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `interpreterStore` | {% badge content="object" /%}                                | The [interpreter store](/docs/api/react/use-interpreter-store). |
| `entitiesIds`      | {% badge content="array" /%} {% badge content="optional" /%} | An optional array of entity IDs to retrieve the values of.      |

### Returns

The `useInterpreterEntitiesValues` function essentially returns an object containing the values of all entities or the selected ones.
