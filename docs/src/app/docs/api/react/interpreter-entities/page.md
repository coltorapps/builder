---
title: InterpreterEntities
nextjs:
  metadata:
    title: InterpreterEntities
    description: API Reference of InterpreterEntities.
---

This React component is used to render the entities tree of an [interpreter store](/docs/api/react/use-interpreter-store).

## Reference

### `<InterpreterEntities interpreterStore components children? />`

Use the `InterpreterEntities` component to render the entities tree.

```tsx
import {
  InterpreterEntities,
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
  },
  root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
};

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder);

  return (
    <InterpreterEntities
      interpreterStore={interpreterStore}
      components={{ textField: TextFieldEntity }}
    />
  );
}
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.

### Props

The `InterpreterEntities` component accepts three props:

| Prop               | Type                                                            | Description {% class="api-description" %}                                                                                                                  |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interpreterStore` | {% badge content="object" /%}                                   | The [interpreter store](/docs/api/react/use-interpreter-store).                                                                                            |
| `components`       | {% badge content="object" /%}                                   | An object mapping of [entities components](/docs/api/react/create-entity-component) for each defined entity type in the builder.                           |
| `children`         | {% badge content="function" /%} {% badge content="optional" /%} | A function intended to wrap each rendered arbitrary entity with additional rendering. It receives both the rendered entity and the entity instance object. |

### Returns

The `InterpreterEntities` component essentially renders an entities tree.

### Render prop

The `children` prop of the `InterpreterEntities` component must be a function, which is used to wrap each rendered arbitrary entity with additional rendering.

```tsx
import {
  InterpreterEntities,
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
  },
  root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
};

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder);

  return (
    <InterpreterEntities
      interpreterStore={interpreterStore}
      components={{ textField: TextFieldEntity }}
    >
      {(props) => (
        <div>
          {/* This is the rendered entity. */}
          {props.children}
        </div>
      )}
    </InterpreterEntities>
  );
}
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.
