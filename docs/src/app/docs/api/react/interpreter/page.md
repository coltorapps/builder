---
title: Interpreter
nextjs:
  metadata:
    title: Interpreter
    description: API Reference of Interpreter.
---

This React component is used to render the entities tree within the context of an [interpreter store](/docs/api/react/use-interpreter-store).

## Reference

### `<Interpreter interpreterStore components children? />`

Use the `Interpreter` component to render the entities tree.

```tsx
import { Interpreter, useInterpreterStore } from "@coltorapps/builder-react";

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
    <Interpreter
      interpreterStore={interpreterStore}
      components={{ textField: TextFieldEntity }}
    />
  );
}
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.

### Props

The `Interpreter` component accepts three props:

| Prop               | Type                                                            | Description {% class="api-description" %}                                                                                                                  |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interpreterStore` | {% badge content="object" /%}                                   | The [interpreter store](/docs/api/react/use-interpreter-store).                                                                                            |
| `components`       | {% badge content="object" /%}                                   | An object mapping of [entities components](/docs/api/react/create-entity-component) for each defined entity type in the builder.                           |
| `children`         | {% badge content="function" /%} {% badge content="optional" /%} | A function intended to wrap each rendered arbitrary entity with additional rendering. It receives both the rendered entity and the entity instance object. |

### Returns

The `Interpreter` component essentially renders an entities tree.

### Render prop

The `children` prop of the `Interpreter` component must be a function, which is used to wrap each rendered arbitrary entity with additional rendering.

```tsx
import { Interpreter, useInterpreterStore } from "@coltorapps/builder-react";

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
    <Interpreter
      interpreterStore={interpreterStore}
      components={{ textField: TextFieldEntity }}
    >
      {(props) => (
        <div>
          {/* This is the rendered entity. */}
          {props.children}
        </div>
      )}
    </Interpreter>
  );
}
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.
