---
title: useBuilderStore
nextjs:
  metadata:
    title: useBuilderStore
    description: API Reference of useBuilderStore.
---

This React hook creates a [builder store](/docs/api/create-builder-store) under the hood and conveniently allows subscribing to events.

## Reference

### `useBuilderStore(builder, options?)`

Use the `useBuilderStore` function to create a [builder store](/docs/api/create-builder-store).

```typescript
import { useBuilderStore } from "@basebuilder/react";

export function App() {
  const builderStore = useBuilderStore();
}
```

### Parameters

`useBuilderStore` accepts a two parameters:

| Parameter | Type                                                          | Description                                             |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| `builder` | {% badge content="object" /%}                                 | The [builder definition](/docs/api/create-builder).     |
| `options` | {% badge content="object" /%} {% badge content="optional" /%} | An optional partial object with initialization options. |

The `options` parameter properties:

| Property      | Type                                                          | Description                                                                               |
| ------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `initialData` | {% badge content="object" /%} {% badge content="optional" /%} | The optional partial initial data of the [builder store](/docs/api/create-builder-store). |
| `events`      | {% badge content="object" /%} {% badge content="optional" /%} | An optional partial object with [events callbacks](#events-callbacks).                    |

### Returns

The `useBuilderStore` function essentially creates and returns a [builder store](/docs/api/create-builder-store).

## Events Callbacks

Each [event](/docs/api/create-builder-store#events) emitted by the builder store is available as a callback within the `events` key of the `options` parameter. Every callback receives a specific payload based on the event.

| Callback                        | Description                              |
| ------------------------------- | ---------------------------------------- |
| `onEntityAdded`                 | An entity was added.                     |
| `onEntityUpdated`               | An entity was updated.                   |
| `onEntityAttributeUpdated`      | An entity's attribute was updated.       |
| `onEntityDeleted`               | An entity was deleted.                   |
| `onEntityCloned`                | An entity was cloned.                    |
| `onRootUpdated`                 | The root was updated.                    |
| `onEntityAttributeErrorUpdated` | An entity's attribute error was updated. |
| `onSchemaErrorUpdated`          | The schema's error was updated.          |
| `onSchemaUpdated`               | The schema was updated.                  |
| `onDataSet`                     | The data was manually set.               |
