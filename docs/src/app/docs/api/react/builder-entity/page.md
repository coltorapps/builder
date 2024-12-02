---
title: BuilderEntity
nextjs:
  metadata:
    title: BuilderEntity
    description: API Reference of BuilderEntity.
---

This React component renders a single entity from a [builder store](/docs/api/react/use-builder-store), including its children.

## Reference

### `<BuilderEntity entityId builderStore components children? />`

Use the `BuilderEntity` component to render a single entity, including its children.

```tsx
import { BuilderEntity, useBuilderStore } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { TextFieldEntity } from "./text-field-entity";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    <BuilderEntity
      entityId="a68836dc-1478-435f-bdee-ca7aff098993"
      builderStore={builderStore}
      components={{ textField: TextFieldEntity }}
    />
  );
}
```

### Props

The `BuilderEntity` component accepts four props:

| Prop           | Type                                                            | Description {% class="api-description" %}                                                                                                                  |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entityId`     | {% badge content="string" /%}                                   | The ID of the entity to render, including its children.                                                                                                    |
| `builderStore` | {% badge content="object" /%}                                   | The [builder store](/docs/api/react/use-builder-store).                                                                                                    |
| `components`   | {% badge content="object" /%}                                   | An object mapping of [entities components](/docs/api/react/create-entity-component) for each defined entity type in the builder.                           |
| `children`     | {% badge content="function" /%} {% badge content="optional" /%} | A function intended to wrap each rendered arbitrary entity with additional rendering. It receives both the rendered entity and the entity instance object. |

### Returns

The `BuilderEntity` component essentially renders a single entity, including its children.

### Render prop

The `children` prop of the `BuilderEntity` component must be a function, which is used to wrap each rendered arbitrary entity with additional rendering. This can be useful, for instance, to render a delete button alongside each entity.

```tsx
import { BuilderEntity, useBuilderStore } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { TextFieldEntity } from "./text-field-entity";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    <BuilderEntity
      entityId="a68836dc-1478-435f-bdee-ca7aff098993"
      builderStore={builderStore}
      components={{ textField: TextFieldEntity }}
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
