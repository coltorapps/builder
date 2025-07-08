---
title: useEntityValueUpdated
nextjs:
  metadata:
    title: useEntityValueUpdated
    description: API Reference of useEntityValueUpdated.
---

The `useEntityValueUpdated` hook calls the provided callback whenever the value of an entity changes in the given [interpreter store](/docs/api/react/use-interpreter-store).

## Reference

### `useEntityValueUpdated(interpreterStore, callback, comparator?)` {% class="break-all" %}

```tsx
import {
  useEntityValueUpdated,
  useInterpreterStore,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  useEntityValueUpdated(interpreterStore, (entity) => {
    console.log(
      `Entity ${entity.id} value changed`,
      "from",
      entity.prevValue,
      "to",
      entity.value,
    );
  });

  return null;
}
```

### Parameters

`useEntityValueUpdated` accepts three parameters:

| Parameter          | Type                                                            | Description {% class="api-description" %}                                                                           |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `interpreterStore` | {% badge content="object" /%}                                   | The [interpreter store](/docs/api/react/use-interpreter-store) instance to monitor.                                 |
| `callback`         | {% badge content="function" /%}                                 | A function called whenever an entity value changes. Receives the updated entity, including `value` and `prevValue`. |
| `comparator`       | {% badge content="function" /%} {% badge content="optional" /%} | Optional comparator used to detect value changes. Defaults to the built-in `shallow` comparator.                    |

### Returns

This hook does not return a value. It registers a side effect that triggers the provided callback whenever an entity's value is updated in the interpreter store.
