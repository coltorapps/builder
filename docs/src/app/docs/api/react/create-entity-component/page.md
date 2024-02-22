---
title: createEntityComponent
nextjs:
  metadata:
    title: createEntityComponent
    description: API Reference of createEntityComponent.
---

This function defines an entity component for later use within the [`<BuilderEntities />`](/docs/api/react/builder-entities) and [`<Interpreter />`](/docs/api/react/interpreter) components.

The function itself serves primarily as a type safety helper and doesn't perform any underlying logic.

## Reference

### `createEntityComponent(entity, render)`

Use the `createEntityComponent` function to define the component for your entity:

```tsx
import { createEntityComponent } from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

export const TextFieldEntity = createEntityComponent(
  textFieldEntity,
  (props) => {
    return (
      <div>
        <label htmlFor={props.entity.id}>{props.entity.attributes.label}</label>
        <input
          id={props.entity.id}
          name={props.entity.id}
          value={props.entity.value ?? ""}
          onChange={(e) => props.setValue(e.target.value)}
          placeholder={props.entity.attributes.placeholder}
          required={props.entity.attributes.required}
        />
        {/* Normally, you'll handle your own error types. */}
        {typeof props.entity.error === "string" ? props.entity.error : null}
      </div>
    );
  },
);
```

### Parameters

`createEntityComponent` accepts two parameters:

| Parameter | Type                            | Description {% class="api-description" %}                                                                                                                                      |
| --------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entity`  | {% badge content="object" /%}   | The [entity definition](/docs/api/create-entity).                                                                                                                              |
| `render`  | {% badge content="function" /%} | The render function of the component, which receives the entity instance and a set of methods to interact with the [interpreter store](/docs/api/react/use-interpreter-store). |

### Returns

The `createEntityComponent` function essentially creates a React component to be used within the [`<BuilderEntities />`](/docs/api/react/builder-entities) and [`<Interpreter />`](/docs/api/react/interpreter) components.
