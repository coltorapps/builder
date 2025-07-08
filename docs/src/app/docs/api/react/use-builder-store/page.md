---
title: useBuilderStore
nextjs:
  metadata:
    title: useBuilderStore
    description: API Reference of useBuilderStore.
---

This React hook creates a [builder store](/docs/api/create-builder-store).

## Reference

### `useBuilderStore(builder, options?)` {% class="break-all" %}

Use the `useBuilderStore` function to create a [builder store](/docs/api/create-builder-store).

```typescript
import { useBuilderStore } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";

export function App() {
  const builderStore = useBuilderStore(formBuilder);
}
```

### Parameters

`useBuilderStore` accepts two parameters:

| Parameter | Type                                                          | Description {% class="api-description" %}                           |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `builder` | {% badge content="object" /%}                                 | The [builder definition](/docs/api/create-builder).                 |
| `options` | {% badge content="object" /%} {% badge content="optional" /%} | An optional partial object with initialization [options](#options). |

{% callout title="You should know!" type="warning" %}
Ensure that the provided `builder` parameter remains stable or is memoized. The builder store will be recreated if the `builder` reference changes, leading to data loss.
{% /callout %}

### Options

The `options` parameter properties:

| Property      | Type                                                          | Description {% class="api-description" %}                                                      |
| ------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `initialData` | {% badge content="object" /%} {% badge content="optional" /%} | The optional partial initial data of the [builder store](/docs/api/create-builder-store#data). |

### Returns

The `useBuilderStore` function essentially creates and returns a [builder store](/docs/api/create-builder-store).
