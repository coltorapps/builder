---
title: BuilderEntityAttributes
nextjs:
  metadata:
    title: BuilderEntityAttributes
    description: API Reference of BuilderEntityAttributes.
---

This React component is used to render the attributes of a specific entity instance within the context of a [builder store](/docs/api/react/use-builder-store).

## Reference

### `<BuilderEntityAttributes builderStore components entityId />`

Use the `BuilderEntityAttributes` component to render the attributes of a specific entity.

```tsx
import {
  BuilderEntityAttributes,
  useBuilderStore,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { LabelAttribute, RequiredAttribute } from "./label-attribute";

function TextFieldAttributes() {
  return (
    <div>
      <LabelAttribute />
      <RequiredAttribute />
    </div>
  );
}

export function App() {
  const builderStore = useBuilderStore(formBuilder);

  const selectedEntityId = "7c6a073c-03c2-4945-91e5-6e2fb6683c1b";

  return (
    <BuilderEntityAttributes
      builderStore={builderStore}
      components={{ textField: TextFieldAttributes }}
      entityId={selectedEntityId}
    />
  );
}
```

In the example above, we've hardcoded the `entityId` prop's value, but typically, you would obtain the ID based on the `builderStore`.

{% callout title="You should know!" %}
If a matched component from the `components` prop attempts to render an [attribute component](/docs/api/react/create-attribute-component) unsupported by the matched entity, a runtime error will be thrown.
{% /callout %}

### Props

`BuilderEntityAttributes` accepts three props:

| Prop           | Type                          | Description {% class="api-description" %}                                                                                                                                                                  |
| -------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `builderStore` | {% badge content="object" /%} | The [builder store](/docs/api/react/use-builder-store).                                                                                                                                                    |
| `components`   | {% badge content="object" /%} | An object mapping of raw components for each defined entity type in the builder. Typically, inside each raw component you will render [attributes components](/docs/api/react/create-attribute-component). |
| `entityId`     | {% badge content="string" /%} | The ID of an entity from the schema.                                                                                                                                                                       |

### Returns

The `BuilderEntityAttributes` component essentially renders the attributes of a specific entity.
