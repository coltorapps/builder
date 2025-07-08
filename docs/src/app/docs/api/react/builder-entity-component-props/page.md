---
title: BuilderEntityComponentProps
nextjs:
  metadata:
    title: BuilderEntityComponentProps
    description: API Reference of BuilderEntityComponentProps.
---

This interface describes the props passed to a builder entity component that is rendered using data from a builder store.

## Reference

### `BuilderEntityComponentProps<TEntity, TBuilder?>` {% class="break-all" %}

Use the `BuilderEntityComponentProps` interface to define an entity component intended for use during the schema building phase.

```tsx
import {
  useAttributeValue,
  type BuilderEntityComponentProps,
} from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

export function BuilderTextFieldEntity(
  props: BuilderEntityComponentProps<typeof textFieldEntity>,
) {
  const label = useAttributeValue(props.entity.attributes.label);

  return (
    <div>
      <label>{label}</label>
      <input />
      <button
        type="button"
        onClick={() =>
          props.entity.attributes.label.setValue(Math.random().toString())
        }
      >
        Randomize label's value
      </button>
    </div>
  );
}
```

{% callout title="You should know!" %}
You can optionally provide a specific builder type as the second generic argument to `BuilderEntityComponentProps` to constrain the prop types to that builder.
{% /callout %}

### Props

The `BuilderEntityComponentProps` interfaces has the following properties:

| Prop             | Type                            | Description {% class="api-description" %}                                                                                                                      |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity`         | {% badge content="object" /%}   | The current [builder entity instance](/docs/api/react/builder-entity-instance) being rendered.                                                                 |
| `builderStore`   | {% badge content="object" /%}   | The [builder store](/docs/api/react/use-builder-store) associated with this entity.                                                                            |
| `RenderChildren` | {% badge content="function" /%} | A helper component to render all children of the current entity. Accepts optional `children` to wrap each rendered entity recursively.                         |
| `RenderChild`    | {% badge content="function" /%} | A helper component to render a specific child entity by the provided ID. Accepts optional `children` to wrap the rendered entity and its children recursively. |

{% callout title="You should know!" %}
The `RenderChild` component is particularly useful when you need fine-grained control over how child entities are rendered, such as when implementing virtualization. You can manually iterate over `entity.children`, which is an array of IDs, and render each one using `RenderChild`.
{% /callout %}
