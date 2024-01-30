---
title: Entities
nextjs:
  metadata:
    title: Entities
    description: API Reference of Entities.
---

This React component is used to render the entities tree of a schema within the context of a [builder store](/docs/api/react/use-builder-store).

## Reference

### `<Entities builderStore components children? />`

Use the `Entities` component to render the entities tree.

```tsx
import { Entities, useBuilderStore } from "@basebuilder/react";

import { formBuilder } from "./form-builder";
import { TextFieldEntity } from "./text-field-entity";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    <Entities
      builderStore={builderStore}
      components={{ textField: TextFieldEntity }}
    />
  );
}
```

### Props

The `Entities` component accepts three props:

| Prop           | Type                                                            | Description {% class="api-description" %}                                                                                                                  |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `builderStore` | {% badge content="object" /%}                                   | The [builder store](/docs/api/react/use-builder-store).                                                                                                    |
| `components`   | {% badge content="object" /%}                                   | An object mapping of [entities components](/docs/api/react/create-entity-component) for each defined entity type in the builder.                           |
| `children`     | {% badge content="function" /%} {% badge content="optional" /%} | A function intended to wrap each rendered arbitrary entity with additional rendering. It receives both the rendered entity and the entity instance object. |

### Returns

The `Entities` component essentially renders an entities tree.

### Render prop

The `children` prop of the `Entities` component must be a function, which is used to wrap each rendered arbitrary entity with additional rendering. This can be useful, for instance, to render a delete button alongside each entity.

```tsx
import { Entities, useBuilderStore } from "@basebuilder/react";

import { formBuilder } from "./form-builder";
import { TextFieldEntity } from "./text-field-entity";

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    <Entities
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
    </Entities>
  );
}
```
