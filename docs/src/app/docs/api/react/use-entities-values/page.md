---
title: useEntitiesValues
nextjs:
  metadata:
    title: useEntitiesValues
    description: API Reference of useEntitiesValues.
---

This React hook retrieves the values of all entities or the selected ones within the context of an [interpreter store](/docs/api/use-interpreter-store). It should be used within the hierarchy of [<Interpreter />](/docs/api/react/interpreter) to access its context. Typically, you'll use it inside [`entities components`](/docs/api/react/create-entity-component).

## Reference

### `useEntitiesValues(entitiesIds?)`

Use the `useEntitiesValues` function to retrieve the values of all entities or the selected ones.

```tsx
import {
  createEntityComponent,
  useEntitiesValues,
} from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

export const TextFieldEntity = createEntityComponent(
  textFieldEntity,
  (props) => {
    const entitiesValues = useEntitiesValues();
  },
);
```

### Parameters

`useEntitiesValues` accepts a single parameter:

| Parameter     | Type                         | Description {% class="api-description" %}                  |
| ------------- | ---------------------------- | ---------------------------------------------------------- |
| `entitiesIds` | {% badge content="array" /%} | An optional array of entity IDs to retrieve the values of. |

### Returns

The `useEntitiesValues` function essentially returns an object containing the values of all entities or the selected ones.
