---
title: BuilderEntities
nextjs:
  metadata:
    title: BuilderEntities
    description: API Reference of BuilderEntities.
---

This React component is used to render the entities tree of a schema within the context of a [builder store](/docs/api/react/use-builder-store).

## Reference

### `<BuilderEntities builderStore components children? />`

Use the `BuilderEntities` component to render the entities tree.

```tsx
import { BuilderEntities, useBuilderStore } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { TextFieldEntity } from "./text-field-entity";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    <BuilderEntities
      builderStore={builderStore}
      components={{ textField: TextFieldEntity }}
    />
  );
}
```

### Props

The `BuilderEntities` component accepts three props:

| Prop           | Type                                                            | Description {% class="api-description" %}                                                                                                                  |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `builderStore` | {% badge content="object" /%}                                   | The [builder store](/docs/api/react/use-builder-store).                                                                                                    |
| `components`   | {% badge content="object" /%}                                   | An object mapping of [entities components](/docs/api/react/create-entity-component) for each defined entity type in the builder.                           |
| `children`     | {% badge content="function" /%} {% badge content="optional" /%} | A function intended to wrap each rendered arbitrary entity with additional rendering. It receives both the rendered entity and the entity instance object. |

### Returns

The `BuilderEntities` component essentially renders an entities tree.

### Render prop

The `children` prop of the `BuilderEntities` component must be a function, which is used to wrap each rendered arbitrary entity with additional rendering. This can be useful, for instance, to render a delete button alongside each entity.

```tsx
import { BuilderEntities, useBuilderStore } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { TextFieldEntity } from "./text-field-entity";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    <BuilderEntities
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
    </BuilderEntities>
  );
}
```
