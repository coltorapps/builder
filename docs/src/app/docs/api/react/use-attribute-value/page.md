---
title: useAttributeValue
nextjs:
  metadata:
    title: useAttributeValue
    description: API Reference of useAttributeValue.
---

The `useAttributeValue` hook subscribes to updates of a specific attribute’s value and returns the selected data. It provides fine-grained control over reactivity and re-renders by allowing a selector and comparator to be passed.

## Reference

### `useAttributeValue(attribute, selector?, comparator?)` {% class="break-all" %}

Use the `useAttributeValue` function to access and subscribe to the value of an [attribute instance](/docs/api/react/attribute-instance).

```tsx
import {
  useAttributeValue,
  type AttributeInstance,
  type BuilderEntityComponentProps,
} from "@coltorapps/builder-react";

import { labelAttribute } from "./label-attribute";

function LabelEditor(props: {
  attribute: AttributeInstance<typeof labelAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  return (
    <input
      value={value ?? ""}
      onChange={(e) => props.attribute.setValue(e.target.value)}
    />
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

`useAttributeValue` accepts three parameters:

| Parameter    | Type                                                            | Description {% class="api-description" %}                                                                                     |
| ------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `attribute`  | {% badge content="object" /%}                                   | The [attribute instance](/docs/api/react/attribute-instance) to subscribe to.                                                 |
| `selector`   | {% badge content="function" /%} {% badge content="optional" /%} | An optional function to select a specific part of the attribute value. Defaults to `(data) => data`.                          |
| `comparator` | {% badge content="function" /%} {% badge content="optional" /%} | An optional comparator function to determine if the selected data has changed. Defaults to the built-in `shallow` comparator. |

### Returns

The `useAttributeValue` hook returns the selected value of the given attribute. If a selector is provided, it returns the derived value instead.
