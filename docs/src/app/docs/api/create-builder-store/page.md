---
title: createBuilderStore
nextjs:
  metadata:
    title: createBuilderStore
    description: API Reference of createBuilderStore.
---

This function instantiates a builder store, used for building and operating with schemas based on a specific builder definition.

In most cases, you won't need to use the `createBuilderStore` method directly. Instead, you will mostly utilize the `useBuilderStore` from `@basebuilder/react`, which essentially creates the builder store for you.

## Reference

### `createBuilderStore(options)`

Use the `createBuilderStore` function to instantiate a builder store.

```typescript
import { createBuilderStore } from "basebuilder";

import { formBuilder } from "./form-builder";

export const builderStore = createBuilderStore(formBuilder);
```

### Parameters

`createBuilderStore` accepts two parameters:

| Parameter | Type                                                          | Description                                             |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| `builder` | {% badge content="object" /%}                                 | The builder definition.                                 |
| `options` | {% badge content="object" /%} {% badge content="optional" /%} | An optional partial object with initialization options. |

The `options` parameter properties:

| Property      | Type                                                          | Description                        |
| ------------- | ------------------------------------------------------------- | ---------------------------------- |
| `initialData` | {% badge content="object" /%} {% badge content="optional" /%} | The optional partial initial data. |

### Returns

`createBuilderStore` instantiates a builder store, providing a set of methods to operate with the store.

| Property                        | Type                            | Description                                                                                                                          |
| ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `getData`                       | {% badge content="function" /%} | Retrieves the [store's data](#data).                                                                                                 |
| `getSchema`                     | {% badge content="function" /%} | Retrieves the schema from the [store's data](#data).                                                                                 |
| `getEntitiesAttributesErrors`   | {% badge content="function" /%} | Retrieves the entities' attributes errors from the [store's data](#data).                                                            |
| `getSchemaError`                | {% badge content="function" /%} | Retrieves the schema error from the [store's data](#data).                                                                           |
| `setData`                       | {% badge content="function" /%} | Sets the store's new data.                                                                                                           |
| `subscribe`                     | {% badge content="function" /%} | Subscribes to the [store's events](#events), returning a function `() => void` for unsubscribing.                                    |
| `addEntity`                     | {% badge content="function" /%} | Adds a new entity, returning the newly added entity instance.                                                                        |
| `setEntityParent`               | {% badge content="function" /%} | Sets an entity's parent.                                                                                                             |
| `unsetEntityParent`             | {% badge content="function" /%} | Unsets an entity's parent and moves it to the root.                                                                                  |
| `setEntityIndex`                | {% badge content="function" /%} | Updates an entity's index, either in the parent or in the root.                                                                      |
| `setEntityAttribute`            | {% badge content="function" /%} | Updates an entity's attribute value.                                                                                                 |
| `deleteEntity`                  | {% badge content="function" /%} | Deletes an entity and all its children.                                                                                              |
| `validateEntityAttribute`       | {% badge content="function" /%} | An async function that triggers the validation of a specific attribute of a single entity.                                           |
| `validateEntityAttributes`      | {% badge content="function" /%} | An async function that triggers the validation of all attributes of a single entity.                                                 |
| `validateEntitiesAttributes`    | {% badge content="function" /%} | An async function that triggers the validation of the attributes of all entities.                                                    |
| `resetEntityAttributeError`     | {% badge content="function" /%} | Removes the error of a specific attribute of a single entity.                                                                        |
| `setEntityAttributeError`       | {% badge content="function" /%} | Sets the error of a specific attribute of a single entity.                                                                           |
| `resetEntityAttributesErrors`   | {% badge content="function" /%} | Removes all errors of all attributes of a single entity.                                                                             |
| `setEntityAttributesErrors`     | {% badge content="function" /%} | Sets all errors of all attributes of a single entity.                                                                                |
| `resetEntitiesAttributesErrors` | {% badge content="function" /%} | Removes all errors of all attributes of all entities.                                                                                |
| `setEntitiesAttributesErrors`   | {% badge content="function" /%} | Sets all errors of all attributes of all entities.                                                                                   |
| `validateSchema`                | {% badge content="function" /%} | An async function that triggers the validation of the schema, returning the successfully validated schema or the reason for failure. |
| `setSchemaError`                | {% badge content="function" /%} | Sets the schema's error.                                                                                                             |
| `resetSchemaError`              | {% badge content="function" /%} | Removes the schema's error.                                                                                                          |
| `cloneEntity`                   | {% badge content="function" /%} | Clones an entity along with all its children.                                                                                        |
| `getEntity`                     | {% badge content="function" /%} | Retrieves a specific entity.                                                                                                         |
| `builder`                       | {% badge content="object" /%}   | The builder definition used to instantiate the store.                                                                                |

## Data

The data of the builder store is an object containing the following properties:

| Property                   | Type                           | Description                                                                                     |
| -------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `schema`                   | {% badge content="object" /%}  | Represents the schema, which contains the collection of all entities instances and their order. |
| `entitiesAttributesErrors` | {% badge content="object" /%}  | Represents the validation errors of various entity attributes.                                  |
| `schemaError`              | {% badge content="unknown" /%} | Represents the schema validation error.                                                         |

## Events

The builder store emits various events after mutations to subscribed listeners, with different payloads based on the event. A mutation might cause the store to emit multiple events simultaneously. These events can be emitted by the store:

| Event                         | Description                              |
| ----------------------------- | ---------------------------------------- |
| `EntityAdded`                 | An entity was added.                     |
| `EntityUpdated`               | An entity was updated.                   |
| `EntityAttributeUpdated`      | An entity's attribute was updated.       |
| `EntityDeleted`               | An entity was deleted.                   |
| `EntityCloned`                | An entity was cloned.                    |
| `RootUpdated`                 | The root was updated.                    |
| `EntityAttributeErrorUpdated` | An entity's attribute error was updated. |
| `SchemaErrorUpdated`          | The schema's error was updated.          |
| `SchemaUpdated`               | The schema was updated.                  |
| `DataSet`                     | The data was manually set.               |
