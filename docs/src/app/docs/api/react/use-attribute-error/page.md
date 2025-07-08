---
title: useAttributeError
nextjs:
  metadata:
    title: useAttributeError
    description: API Reference of useAttributeError.
---

The `useAttributeError` hook subscribes to the error state of a specific attribute and returns the selected result. It provides fine-grained control over reactivity and re-renders by allowing a selector and comparator to be passed.

## Reference

### `useAttributeError(attribute, selector?, comparator?)` {% class="break-all" %}

Use the `useAttributeError` function to access and subscribe to the error value of an [attribute instance](/docs/api/react/attribute-instance).

```tsx
import {
  useAttributeError,
  useAttributeValue,
  type AttributeInstance,
  type BuilderEntityComponentProps,
} from "@coltorapps/builder-react";

import { labelAttribute } from "./label-attribute";

function LabelEditor(props: {
  attribute: AttributeInstance<typeof labelAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  const error = useAttributeError(props.attribute);

  return (
    <div>
      <input
        value={value ?? ""}
        onChange={(e) => props.attribute.setValue(e.target.value)}
      />
      {error ? String(error) : null}
    </div>
  );
}

export function TextFieldEntityAttributesEditor(
  props: BuilderEntityComponentProps<typeof textFieldEntity>,
) {
  return (
    <div>
      <LabelEditor attribute={props.entity.attributes.label} />
    </div>
  );
}
```

### Parameters

`useAttributeError` accepts three parameters:

| Parameter    | Type                                                            | Description {% class="api-description" %}                                                                                           |
| ------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `attribute`  | {% badge content="object" /%}                                   | The [attribute instance](/docs/api/react/attribute-instance) to subscribe to.                                                       |
| `selector`   | {% badge content="function" /%} {% badge content="optional" /%} | An optional function to select a specific part of the error. Defaults to `(data) => data`.                                          |
| `comparator` | {% badge content="function" /%} {% badge content="optional" /%} | An optional comparator function to determine if the selected error data has changed. Defaults to the built-in `shallow` comparator. |

### Returns

The `useAttributeError` hook returns the selected error value of the given attribute. If a selector is provided, it returns the derived value instead.
