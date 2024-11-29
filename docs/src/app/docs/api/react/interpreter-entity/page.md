---
title: InterpreterEntity
nextjs:
  metadata:
    title: InterpreterEntity
    description: API Reference of InterpreterEntity.
---

This React component renders a single entity from an [interpreter store](/docs/api/react/use-interpreter-store), including its children.

## Reference

### `<InterpreterEntity interpreterStore components children? />`

Use the `InterpreterEntity` component to render a single entity, including its children.

```tsx
import {
  InterpreterEntity,
  useInterpreterStore,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { TextFieldEntity } from "./text-field-entity";

const formSchema = {
  entities: {
    "51324b32-adc3-4d17-a90e-66b5453935bd": {
      type: "textField",
      attributes: {
        label: "First name",
      },
    },
    "a2971678-1e09-48dc-80e9-70f4fe75d4db": {
      type: "textField",
      attributes: {
        label: "Last name",
      },
    },
  },
  root: [
    "51324b32-adc3-4d17-a90e-66b5453935bd",
    "a2971678-1e09-48dc-80e9-70f4fe75d4db",
  ],
};

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder);

  return (
    <InterpreterEntity
      entityId="a2971678-1e09-48dc-80e9-70f4fe75d4db"
      interpreterStore={interpreterStore}
      components={{ textField: TextFieldEntity }}
    />
  );
}
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.

### Props

The `InterpreterEntity` component accepts four props:

| Prop               | Type                                                            | Description {% class="api-description" %}                                                                                                                  |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entityId`         | {% badge content="string" /%}                                   | The ID of the entity to render, including its children.                                                                                                    |
| `interpreterStore` | {% badge content="object" /%}                                   | The [interpreter store](/docs/api/react/use-interpreter-store).                                                                                            |
| `components`       | {% badge content="object" /%}                                   | An object mapping of [entities components](/docs/api/react/create-entity-component) for each defined entity type in the builder.                           |
| `children`         | {% badge content="function" /%} {% badge content="optional" /%} | A function intended to wrap each rendered arbitrary entity with additional rendering. It receives both the rendered entity and the entity instance object. |

### Returns

The `InterpreterEntity` component essentially renders a single entity, including its children.

### Render prop

The `children` prop of the `InterpreterEntity` component must be a function, which is used to wrap each rendered arbitrary entity with additional rendering.

```tsx
import {
  InterpreterEntity,
  useInterpreterStore,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { TextFieldEntity } from "./text-field-entity";

const formSchema = {
  entities: {
    "51324b32-adc3-4d17-a90e-66b5453935bd": {
      type: "textField",
      attributes: {
        label: "First name",
      },
    },
    "a2971678-1e09-48dc-80e9-70f4fe75d4db": {
      type: "textField",
      attributes: {
        label: "Last name",
      },
    },
  },
  root: [
    "51324b32-adc3-4d17-a90e-66b5453935bd",
    "a2971678-1e09-48dc-80e9-70f4fe75d4db",
  ],
};

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder);

  return (
    <InterpreterEntity
      entityId="a2971678-1e09-48dc-80e9-70f4fe75d4db"
      interpreterStore={interpreterStore}
      components={{ textField: TextFieldEntity }}
    >
      {(props) => (
        <div>
          {/* This is the rendered entity. */}
          {props.children}
        </div>
      )}
    </InterpreterEntity>
  );
}
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.
