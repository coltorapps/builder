---
title: Entities
nextjs:
  metadata:
    title: Entities
    description: API Reference of Entities.
---

This React component is used to render the entities tree within the context of a [builder store](/docs/api/create-builder-store).

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

`Entities` accepts three props:

| Prop           | Type                                                            | Description                                                                                                                                                |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `builderStore` | {% badge content="object" /%}                                   | The [builder store](/docs/api/create-builder-store).                                                                                                       |
| `components`   | {% badge content="object" /%}                                   | An object mapping of entities components defined with [createEntityComponent](/docs/api/react/create-entity-component).                                    |
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
