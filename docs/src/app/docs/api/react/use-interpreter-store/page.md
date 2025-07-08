---
title: useInterpreterStore
nextjs:
  metadata:
    title: useInterpreterStore
    description: API Reference of useInterpreterStore.
---

This React hook creates an [interpreter store](/docs/api/create-interpreter-store).

## Reference

### `useInterpreterStore(builder, schema, options?)` {% class="break-all" %}

Use the `useInterpreterStore` function to create an [interpreter store](/docs/api/create-interpreter-store).

```typescript
import { useInterpreterStore } from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";

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
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);
}
```

In the example above, we've hardcoded the schema, but typically, you would fetch it from some data source, for instance.

### Parameters

`useInterpreterStore` accepts three parameters:

| Parameter | Type                                                          | Description {% class="api-description" %}                                                    |
| --------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `builder` | {% badge content="object" /%}                                 | The [builder definition](/docs/api/create-builder).                                          |
| `schema`  | {% badge content="object" /%}                                 | The schema that was built using the provided [builder definition](/docs/api/create-builder). |
| `options` | {% badge content="object" /%} {% badge content="optional" /%} | An optional partial object with initialization [options](#options).                          |

{% callout title="You should know!" type="warning" %}
Ensure that the provided `builder` and `schema` parameters remain stable or are memoized. The interpreter store will be recreated if these references change, leading to data loss.
{% /callout %}

### Options

The `options` parameter properties:

| Property                            | Type                                                           | Description {% class="api-description" %}                                                              |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `initialData`                       | {% badge content="object" /%} {% badge content="optional" /%}  | The optional partial initial data of the [interpreter store](/docs/api/create-interpreter-store#data). |
| `initialEntitiesValuesWithDefaults` | {% badge content="boolean" /%} {% badge content="optional" /%} | A flag to enable or disable the automatic setting of default values. Defaults to `true`.               |

### Returns

The `useInterpreterStore` function essentially creates and returns an [interpreter store](/docs/api/create-interpreter-store).
