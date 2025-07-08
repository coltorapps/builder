---
title: InterpreterEntities
nextjs:
  metadata:
    title: InterpreterEntities
    description: API Reference of InterpreterEntities.
---

This React component is used to render the entities tree of an [interpreter store](/docs/api/react/use-interpreter-store).

## Reference

### `<InterpreterEntities interpreterStore components children? />` {% class="break-all" %}

Use the `InterpreterEntities` component to render the entities tree.

```tsx
import {
  InterpreterEntities,
  useInterpreterStore,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { InterpreterTextFieldEntity } from "./text-field-entity";

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

const components = { textField: InterpreterTextFieldEntity };

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  return (
    <InterpreterEntities
      interpreterStore={interpreterStore}
      components={components}
    />
  );
}
```

In the example above, we've hardcoded the schema, but typically, you would fetch it from some data source, for instance.

### Props

The `InterpreterEntities` component accepts three props:

| Prop               | Type                                                            | Description {% class="api-description" %}                                                                                                               |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interpreterStore` | {% badge content="object" /%}                                   | The [interpreter store](/docs/api/react/use-interpreter-store).                                                                                         |
| `components`       | {% badge content="object" /%}                                   | An object mapping of [interpreter entities components](/docs/api/react/interpreter-entity-component-props) for each defined entity type in the builder. |
| `children`         | {% badge content="function" /%} {% badge content="optional" /%} | [A render prop](#render-prop) intended to wrap each rendered arbitrary entity with additional rendering recursively.                                    |

### Render prop

The `children` prop of the `InterpreterEntities` component must be a function, which is used to wrap each rendered arbitrary entity with additional rendering.

```tsx
import {
  InterpreterEntities,
  useInterpreterStore,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { InterpreterTextFieldEntity } from "./text-field-entity";

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

const components = { textField: InterpreterTextFieldEntity };

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder);

  return (
    <InterpreterEntities
      interpreterStore={interpreterStore}
      components={components}
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

In the example above, we've hardcoded the schema, but typically, you would fetch it from some data source, for instance.

### Returns

The `InterpreterEntities` component essentially renders an entities tree.
