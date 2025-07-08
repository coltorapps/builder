---
title: useEntityAttributesValues
nextjs:
  metadata:
    title: useEntityAttributesValues
    description: API Reference of useEntityAttributesValues.
---

The `useEntityAttributesValues` hook subscribes to all attribute value updates of a given entity and returns the selected result. It provides fine-grained control over reactivity and re-renders by allowing a selector and comparator to be passed.

## Reference

### `useEntityAttributesValues(entity, selector?, comparator?)` {% class="break-all" %}

Use the `useEntityAttributesValues` function to access and subscribe to the current values of all attributes on an [entity instance](/docs/api/react/builder-entity-instance).

```tsx
import {
  useEntityAttributesValues,
  type BuilderEntityComponentProps,
} from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

export function BuilderTextFieldEntity(
  props: BuilderEntityComponentProps<typeof textFieldEntity>,
) {
  const attributes = useEntityAttributesValues(props.entity);

  return (
    <div>
      <label>
        {attributes.label} {attributes.required ? "*" : null}
      </label>
      <input />
    </div>
  );
}
```

### Parameters

`useEntityAttributesValues` accepts three parameters:

| Parameter    | Type                                                            | Description {% class="api-description" %}                                                                                     |
| ------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `entity`     | {% badge content="object" /%}                                   | The [entity instance](/docs/api/react/builder-entity-instance) to subscribe to.                                               |
| `selector`   | {% badge content="function" /%} {% badge content="optional" /%} | An optional function to select a specific part of the entity's attribute values. Defaults to `(data) => data`.                |
| `comparator` | {% badge content="function" /%} {% badge content="optional" /%} | An optional comparator function to determine if the selected data has changed. Defaults to the built-in `shallow` comparator. |

### Returns

The `useEntityAttributesValues` hook returns the selected values of all attributes on the given entity. If a selector is provided, it returns the derived value instead.
