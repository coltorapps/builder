---
title: InterpreterEntityComponentProps
nextjs:
  metadata:
    title: InterpreterEntityComponentProps
    description: API Reference of InterpreterEntityComponentProps.
---

This interface describes the props passed to a builder entity component that is rendered using data from a builder store.

## Reference

### `InterpreterEntityComponentProps<TEntity, TBuilder?>` {% class="break-all" %}

Use the `InterpreterEntityComponentProps` interface to define an entity component intended for use during the schema building phase.

```tsx
import {
  useEntityValue,
  type InterpreterEntityComponentProps,
} from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

export function InterpreterTextFieldEntity(
  props: InterpreterEntityComponentProps<typeof textFieldEntity>,
) {
  const value = useEntityValue(props.entity);

  return (
    <div>
      <label>{props.entity.attributes.label}</label>
      <input
        value={value ?? ""}
        onChange={(e) => props.entity.setValue(e.target.value)}
      />
    </div>
  );
}
```

{% callout title="You should know!" %}
You can optionally provide a specific builder type as the second generic argument to `InterpreterEntityComponentProps` to constrain the prop types to that builder.
{% /callout %}

### Props

The `InterpreterEntityComponentProps` interfaces has the following properties:

| Prop               | Type                            | Description {% class="api-description" %}                                                                                                                      |
| ------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity`           | {% badge content="object" /%}   | The current [interpreter entity instance](/docs/api/react/interpreter-entity-instance) being rendered.                                                         |
| `interpreterStore` | {% badge content="object" /%}   | The [interpreter store](/docs/api/react/use-interpreter-store) associated with this entity.                                                                    |
| `RenderChildren`   | {% badge content="function" /%} | A helper component to render all children of the current entity. Accepts optional `children` to wrap each rendered entity recursively.                         |
| `RenderChild`      | {% badge content="function" /%} | A helper component to render a specific child entity by the provided ID. Accepts optional `children` to wrap the rendered entity and its children recursively. |

{% callout title="You should know!" %}
The `RenderChild` component is particularly useful when you need fine-grained control over how child entities are rendered, such as when implementing virtualization. You can manually iterate over `entity.children`, which is an array of IDs, and render each one using `RenderChild`.
{% /callout %}
