---
title: useInterpreterStore
nextjs:
  metadata:
    title: useInterpreterStore
    description: API Reference of useInterpreterStore.
---

This React hook creates an [interpreter store](/docs/api/create-interpreter-store).

## Reference

### `useInterpreterStore(builder, schema, options?)`

Use the `useInterpreterStore` function to create an [interpreter store](/docs/api/create-interpreter-store).

```typescript
import { useInterpreterStore } from "@basebuilder/react";

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

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.

### Parameters

`useInterpreterStore` accepts three parameters:

| Parameter | Type                                                          | Description                                                                                  |
| --------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `builder` | {% badge content="object" /%}                                 | The [builder definition](/docs/api/create-builder).                                          |
| `schema`  | {% badge content="object" /%}                                 | The schema that was built using the provided [builder definition](/docs/api/create-builder). |
| `options` | {% badge content="object" /%} {% badge content="optional" /%} | An optional partial object with initialization options.                                      |

The `options` parameter properties:

| Property      | Type                                                          | Description                                                                                            |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `initialData` | {% badge content="object" /%} {% badge content="optional" /%} | The optional partial initial data of the [interpreter store](/docs/api/create-interpreter-store#data). |
| `events`      | {% badge content="object" /%} {% badge content="optional" /%} | An optional partial object with [events callbacks](#events-callbacks).                                 |

### Returns

The `useInterpreterStore` function essentially creates and returns an [interpreter store](/docs/api/create-interpreter-store).

## Events Callbacks

Each [event](/docs/api/create-interpreter-store#events) emitted by the builder store is available as a callback within the `events` key of the `options` parameter. Every callback receives a specific payload based on the event.

| Callback                | Description                               |
| ----------------------- | ----------------------------------------- |
| `onEntityValueUpdated`  | An entity's value was updated.            |
| `onEntityErrorUpdated`  | An entity's validation error was updated. |
| `onEntityUnprocessable` | An entity was marked as unprocessable.    |
| `onEntityProcessable`   | An entity was marked as processable.      |
| `onDataSet`             | The data was manually set.                |
