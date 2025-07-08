---
title: useEntityValue
nextjs:
  metadata:
    title: useEntityValue
    description: API Reference of useEntityValue.
---

The `useEntityValue` hook subscribes to the value of a specific [interpreter entity instance](/docs/api/react/interpreter-entity-instance) and returns the selected result. It provides fine-grained control over reactivity and re-renders by allowing a selector and comparator to be passed.

## Reference

### `useEntityValue(entity, selector?, comparator?)` {% class="break-all" %}

Use the `useEntityValue` function to access and subscribe to the current value of a specific entity instance.

```tsx
import {
  useEntityValue,
  type InterpreterEntityComponentProps,
  type InterpreterEntityInstance,
} from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

function TextFieldInput(props: {
  entity: InterpreterEntityInstance<typeof textFieldEntity>;
}) {
  const value = useEntityValue(props.entity);

  return (
    <input
      value={value ?? ""}
      onChange={(e) => props.entity.setValue(e.target.value)}
    />
  );
}

export function InterpreterTextFieldEntity(
  props: InterpreterEntityComponentProps<typeof textFieldEntity>,
) {
  return <TextFieldInput entity={props.entity} />;
}
```

### Parameters

`useEntityValue` accepts three parameters:

| Parameter    | Type                                                            | Description {% class="api-description" %}                                                                                      |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `entity`     | {% badge content="object" /%}                                   | The [interpreter entity instance](/docs/api/react/interpreter-entity-instance) to subscribe to.                                |
| `selector`   | {% badge content="function" /%} {% badge content="optional" /%} | An optional function to select a specific part of the entity value. Defaults to `(data) => data`.                              |
| `comparator` | {% badge content="function" /%} {% badge content="optional" /%} | An optional comparator function to determine if the selected value has changed. Defaults to the built-in `shallow` comparator. |

### Returns

The `useEntityValue` hook returns the selected value of the given entity. If a selector is provided, it returns the derived value instead.
