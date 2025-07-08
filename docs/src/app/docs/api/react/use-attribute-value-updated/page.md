---
title: useAttributeValueUpdated
nextjs:
  metadata:
    title: useAttributeValueUpdated
    description: API Reference of useAttributeValueUpdated.
---

The `useAttributeValueUpdated` hook calls the provided callback whenever an attribute value changes on any entity in the given [builder store](/docs/api/react/use-builder-store).

## Reference

### `useAttributeValueUpdated(builderStore, callback, comparator?)` {% class="break-all" %}

```tsx
import {
  useAttributeValueUpdated,
  useBuilderStore,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  useAttributeValueUpdated(builderStore, (entity) => {
    console.log(`Attribute "${entity.updatedAttributeName}" updated`, entity);
  });

  return null;
}
```

### Parameters

`useAttributeValueUpdated` accepts three parameters:

| Parameter      | Type                                                            | Description {% class="api-description" %}                                                                           |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `builderStore` | {% badge content="object" /%}                                   | The [builder store](/docs/api/react/use-builder-store) instance to monitor.                                         |
| `callback`     | {% badge content="function" /%}                                 | A function called whenever any attribute value changes. Receives the updated entity and the `updatedAttributeName`. |
| `comparator`   | {% badge content="function" /%} {% badge content="optional" /%} | Optional comparator used to detect attribute value changes. Defaults to the built-in `shallow` comparator.          |

### Returns

This hook does not return a value. It registers a side effect that triggers the provided callback whenever any attribute on any entity is updated.
