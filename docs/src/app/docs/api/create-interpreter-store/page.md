---
title: createInterpreterStore
nextjs:
  metadata:
    title: createInterpreterStore
    description: API Reference of createInterpreterStore.
---

This function instantiates an interpreter store, used for for filling entities values based on a schema and builder definition.

In most cases, you won't need to use the `createInterpreterStore` method directly. Instead, you will mostly utilize [`useInterpreterStore`](/docs/api/react/use-interpreter-store) from `@coltorapps/builder-react`, which essentially creates the interpreter store for you.

## Reference

### `createInterpreterStore(builder, schema, options?)`

Use the `createInterpreterStore` function to instantiate an interpreter store.

```typescript
import { createInterpreterStore } from "@coltorapps/builder";

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

export const interpreterStore = createInterpreterStore(formBuilder, schema);
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.

### Parameters

`createInterpreterStore` accepts three parameters:

| Parameter | Type                                                          | Description {% class="api-description" %}                                                    |
| --------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `builder` | {% badge content="object" /%}                                 | The [builder definition](/docs/api/create-builder).                                          |
| `schema`  | {% badge content="object" /%}                                 | The schema that was built using the provided [builder definition](/docs/api/create-builder). |
| `options` | {% badge content="object" /%} {% badge content="optional" /%} | An optional partial object with initialization options.                                      |

The `options` parameter properties:

| Property                            | Type                                                           | Description {% class="api-description" %}                                                |
| ----------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `initialData`                       | {% badge content="object" /%} {% badge content="optional" /%}  | The optional partial initial data.                                                       |
| `initialEntitiesValuesWithDefaults` | {% badge content="boolean" /%} {% badge content="optional" /%} | A flag to enable or disable the automatic setting of default values. Defaults to `true`. |

### Returns

`createInterpreterStore` instantiates an interpreter store, providing a set of methods to operate with the store.

| Method                        | Type                            | Description {% class="api-description" %}                                                         |
| ----------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `getData`                     | {% badge content="function" /%} | Retrieves the [store's data](#data).                                                              |
| `getEntitiesErrors`           | {% badge content="function" /%} | Retrieves the entities' validation errors from the [store's data](#data).                         |
| `getEntitiesValues`           | {% badge content="function" /%} | Retrieves the values of entities from the [store's data](#data).                                  |
| `getUnprocessableEntitiesIds` | {% badge content="function" /%} | Retrieves the IDs of entities excluded from processing from the [store's data](#data).            |
| `setData`                     | {% badge content="function" /%} | Sets the store's new data.                                                                        |
| `subscribe`                   | {% badge content="function" /%} | Subscribes to the [store's events](#events), returning a function `() => void` for unsubscribing. |
| `validateEntityValue`         | {% badge content="function" /%} | An async function that triggers the validation of a single entity.                                |
| `validateEntitiesValues`      | {% badge content="function" /%} | An async function that triggers the validation of all entities.                                   |
| `setEntityValue`              | {% badge content="function" /%} | Sets the value of an entity.                                                                      |
| `resetEntityValue`            | {% badge content="function" /%} | Resets the value of an entity to its default.                                                     |
| `resetEntitiesValues`         | {% badge content="function" /%} | Resets the values of all entities to their defaults.                                              |
| `clearEntityValue`            | {% badge content="function" /%} | Clears the value of an entity.                                                                    |
| `clearEntitiesValues`         | {% badge content="function" /%} | Clears the values of all entities.                                                                |
| `setEntityError`              | {% badge content="function" /%} | Sets the validation error of an entity.                                                           |
| `resetEntityError`            | {% badge content="function" /%} | Resets the validation error of an entity.                                                         |
| `resetEntitiesErrors`         | {% badge content="function" /%} | Resets the validation errors of all entities.                                                     |
| `setEntitiesErrors`           | {% badge content="function" /%} | Sets the validation errors of all entities.                                                       |
| `isEntityProcessable`         | {% badge content="function" /%} | Returns a boolean indicating whether an entity is processable or not.                             |
| `getEntityValue`              | {% badge content="function" /%} | Retrieves the value of a specific entity.                                                         |
| `getEntityError`              | {% badge content="function" /%} | Retrieves the validation error of a specific entity.                                              |
| `builder`                     | {% badge content="object" /%}   | The [builder definition](/docs/api/create-builder) used to instantiate the store.                 |
| `schema`                      | {% badge content="object" /%}   | The schema used to instantiate the store.                                                         |

## Data

The data of the interpreter store is an object containing the following properties:

| Property                   | Type                          | Description {% class="api-description" %}             |
| -------------------------- | ----------------------------- | ----------------------------------------------------- |
| `entitiesValues`           | {% badge content="object" /%} | Represents the values of entities.                    |
| `entitiesErrors`           | {% badge content="object" /%} | Represents the validation errors of entities.         |
| `unprocessableEntitiesIds` | {% badge content="array" /%}  | Represents the entities IDs excluded from processing. |

## Events

The interpreter store emits various events after mutations to subscribed listeners, with different payloads based on the event. A mutation might cause the store to emit multiple events simultaneously. These events can be emitted by the store:

| Event                 | Description {% class="api-description" %} |
| --------------------- | ----------------------------------------- |
| `EntityValueUpdated`  | An entity's value was updated.            |
| `EntityErrorUpdated`  | An entity's validation error was updated. |
| `EntityUnprocessable` | An entity was marked as unprocessable.    |
| `EntityProcessable`   | An entity was marked as processable.      |
| `DataSet`             | The data was manually set.                |
