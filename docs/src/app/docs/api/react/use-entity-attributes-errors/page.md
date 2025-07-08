---
title: useEntityAttributesErrors
nextjs:
  metadata:
    title: useEntityAttributesErrors
    description: API Reference of useEntityAttributesErrors.
---

The `useEntityAttributesErrors` hook subscribes to all attribute error updates of a given entity and returns the selected result. It provides fine-grained control over reactivity and re-renders by allowing a selector and comparator to be passed.

## Reference

### `useEntityAttributesErrors(entity, selector?, comparator?)` {% class="break-all" %}

Use the `useEntityAttributesErrors` function to access and subscribe to the current validation errors of all attributes on an [entity instance](/docs/api/react/builder-entity-instance).

```tsx
import {
  useEntityAttributesErrors,
  useEntityAttributesValues,
  type BuilderEntityComponentProps,
} from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

export function BuilderTextFieldEntity(
  props: BuilderEntityComponentProps<typeof textFieldEntity>,
) {
  const attributesValues = useEntityAttributesValues(props.entity);

  const attributesErrors = useEntityAttributesErrors(props.entity);

  return (
    <div>
      <label>
        {attributesValues.label} {attributesValues.required ? "*" : null}
        {Object.keys(attributesErrors).length > 0
          ? "Some attributes are invalid"
          : null}
      </label>
      <input />
    </div>
  );
}
```

### Parameters

`useEntityAttributesErrors` accepts three parameters:

| Parameter    | Type                                                            | Description {% class="api-description" %}                                                                                     |
| ------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `entity`     | {% badge content="object" /%}                                   | The [entity instance](/docs/api/react/builder-entity-instance) to subscribe to.                                               |
| `selector`   | {% badge content="function" /%} {% badge content="optional" /%} | An optional function to select a specific part of the entity's attribute errors. Defaults to `(data) => data`.                |
| `comparator` | {% badge content="function" /%} {% badge content="optional" /%} | An optional comparator function to determine if the selected data has changed. Defaults to the built-in `shallow` comparator. |

### Returns

The `useEntityAttributesErrors` hook returns the selected validation errors of all attributes on the given entity. If a selector is provided, it returns the derived value instead.
