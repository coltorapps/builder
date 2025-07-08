---
title: BuilderEntity
nextjs:
  metadata:
    title: BuilderEntity
    description: API Reference of BuilderEntity.
---

This React component renders a single entity from a [builder store](/docs/api/react/use-builder-store), including its children.

## Reference

### `<BuilderEntity entityId builderStore components children? />` {% class="break-all" %}

Use the `BuilderEntity` component to render a single entity, including its children.

```tsx
import { BuilderEntity, useBuilderStore } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { BuilderTextFieldEntity } from "./text-field-entity";

const components = { textField: BuilderTextFieldEntity };

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    <BuilderEntity
      entityId="a68836dc-1478-435f-bdee-ca7aff098993"
      builderStore={builderStore}
      components={components}
    />
  );
}
```

{% callout title="You should know!" %}
The `BuilderEntity` component is especially useful when you need fine-grained control over how entities are rendered, such as when implementing virtualization. You can extract the root entity IDs from the builder store using the `useBuilderStoreData(builderStore, data => data.schema.root)` hook and manually iterate over them.
{% /callout %}

### Props

The `BuilderEntity` component accepts four props:

| Prop           | Type                                                            | Description {% class="api-description" %}                                                                                                                                     |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entityId`     | {% badge content="string" /%}                                   | The ID of the entity to render, including its children.                                                                                                                       |
| `builderStore` | {% badge content="object" /%}                                   | The [builder store](/docs/api/react/use-builder-store).                                                                                                                       |
| `components`   | {% badge content="object" /%}                                   | An object mapping of [builder entities components](/docs/api/react/builder-entity-component-props) for each defined entity type in the builder.                               |
| `children`     | {% badge content="function" /%} {% badge content="optional" /%} | [A render prop](#render-prop) intended to wrap each rendered arbitrary entity with additional rendering. It receives both the rendered entity and the entity instance object. |

### Render prop

The `children` prop of the `BuilderEntity` component is a function, which is used to wrap each rendered arbitrary entity with additional rendering. This can be useful, for instance, to render a delete button alongside each entity.

```tsx
import { BuilderEntity, useBuilderStore } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { BuilderTextFieldEntity } from "./text-field-entity";

const components = { textField: BuilderTextFieldEntity };

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    <BuilderEntity
      entityId="a68836dc-1478-435f-bdee-ca7aff098993"
      builderStore={builderStore}
      components={components}
    >
      {(props) => (
        <div>
          {/* This is the rendered entity. */}
          {props.children}
          <button
            onClick={() => {
              builderStore.deleteEntity(props.entity.id);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </BuilderEntity>
  );
}
```

### Returns

The `BuilderEntity` component essentially renders a single entity, including its children.
