---
title: InterpreterEntity
nextjs:
  metadata:
    title: InterpreterEntity
    description: API Reference of InterpreterEntity.
---

This React component renders a single entity from an [interpreter store](/docs/api/react/use-interpreter-store), including its children.

## Reference

### `<InterpreterEntity entityId interpreterStore components children? />` {% class="break-all" %}

Use the `InterpreterEntity` component to render a single entity, including its children.

```tsx
import {
  InterpreterEntity,
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

const components = { textField: InterpreterTextFieldEntity };

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  return (
    <InterpreterEntity
      entityId="a2971678-1e09-48dc-80e9-70f4fe75d4db"
      interpreterStore={interpreterStore}
      components={components}
    />
  );
}
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from some data source, for instance.

{% callout title="You should know!" %}
The `InterpreterEntity` component is especially useful when you need fine-grained control over how entities are rendered, such as when implementing virtualization. You can extract the root entity IDs from `yourCoolSchema.root` and manually iterate over them.
{% /callout %}

### Props

The `InterpreterEntity` component accepts four props:

| Prop               | Type                                                            | Description {% class="api-description" %}                                                                                                               |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entityId`         | {% badge content="string" /%}                                   | The ID of the entity to render, including its children.                                                                                                 |
| `interpreterStore` | {% badge content="object" /%}                                   | The [interpreter store](/docs/api/react/use-interpreter-store).                                                                                         |
| `components`       | {% badge content="object" /%}                                   | An object mapping of [interpreter entities components](/docs/api/react/interpreter-entity-component-props) for each defined entity type in the builder. |
| `children`         | {% badge content="function" /%} {% badge content="optional" /%} | [A render prop](#render-prop) intended to wrap each rendered arbitrary entity with additional rendering recursively.                                    |

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
import { InterpreterTextFieldEntity } from "./text-field-entity";

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

const components = { textField: InterpreterTextFieldEntity };

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  return (
    <InterpreterEntity
      entityId="a2971678-1e09-48dc-80e9-70f4fe75d4db"
      interpreterStore={interpreterStore}
      components={components}
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

In the example above, we've hardcoded the schema, but typically, you would retrieve it from some data source, for instance.
