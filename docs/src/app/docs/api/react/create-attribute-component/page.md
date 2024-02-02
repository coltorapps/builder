---
title: createAttributeComponent
nextjs:
  metadata:
    title: createAttributeComponent
    description: API Reference of createAttributeComponent.
---

This function defines an attribute component for later use within the [`<EntityAttributes />`](/docs/api/react/entity-attributes) component.

The function is not just a type safety helper compared to [createEntityComponent](/docs/api/react/create-entity-component), because it consumes data from an internal context behind the scenes.

## Reference

### `createAttributeComponent(attribute, render)`

Use the `createAttributeComponent` function to define the visual component for your entity:

```tsx
import { createAttributeComponent } from "@coltorapps/builder-react";

import { labelAttribute } from "./label-attribute";

export const LabelAttribute = createAttributeComponent(
  labelAttribute,
  (props) => {
    const id = `${props.entity.id}-${props.attribute.name}`;

    return (
      <div>
        <label htmlFor={id}>Field Label</label>
        <input
          id={id}
          name={id}
          value={props.attribute.value ?? ""}
          onChange={(e) => props.setValue(e.target.value)}
          required
        />
        {/* Normally, you'll handle your own error types. */}
        {typeof props.attribute.error === "string"
          ? props.attribute.error
          : null}
      </div>
    );
  },
);
```

### Parameters

`createAttributeComponent` accepts two parameters:

| Parameter   | Type                            | Description {% class="api-description" %}                                                                                                                                                              |
| ----------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `attribute` | {% badge content="object" /%}   | The [attribute definition](/docs/api/create-attribute).                                                                                                                                                |
| `render`    | {% badge content="function" /%} | The render function of the component, which receives the attribute and arbitrary entity instance, along with a set of methods to interact with the [builder store](/docs/api/react/use-builder-store). |

### Returns

The `createAttributeComponent` function essentially creates a React component to be used within the [`<EntityAttributes />`](/docs/api/react/entity-attributes) component.
