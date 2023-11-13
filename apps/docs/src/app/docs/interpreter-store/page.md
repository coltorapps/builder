---
title: Interpreter Store
nextjs:
  metadata:
    title: Interpreter Store
    description: Understanding interpreter stores.
---

An interpreter store serves as the central component used for filling entities values based on a schema and builder definition.

---

## Creating an interpreter store

The `createInterpreterStore` method is utilized to establish an interpreter store based on one of your custom builders and a schema.

In most cases, you won't need to use the `createInterpreterStore` method directly. Instead, you will mostly utilize the `useInterpreterStore` from `@basebuilder/react`, which essentially creates the interpreter store for you.

This store is equipped to handle tasks such as setting entities values and performing validation of entities values.

```typescript
import { createInterpreterStore } from "basebuilder";

import { formBuilder } from "./form-builder";

const formInterpreterStore = createInterpreterStore(formBuilder, {
  entities: {
    "51324b32-adc3-4d17-a90e-66b5453935bd": {
      type: "textField",
      attributes: {
        label: "First name",
      },
    },
  },
  root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
});
```

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.

Now, we can start interacting with the store.

```typescript
formInterpreterStore.setEntityValue(
  "51324b32-adc3-4d17-a90e-66b5453935bd",
  "Alex",
);

void formInterpreterStore.validateEntities();
```

We have the ability to access the values of the entities:

```typescript
formInterpreterStore.getEntitiesValues();
```

This will be equivalent to:

```json
{
  "51324b32-adc3-4d17-a90e-66b5453935bd": "Alex"
}
```

## Subscribing to changes

An interpreter store offers a `subscribe` method that facilitates subscribing to data changes. With each change, you'll receive both the updated data and an array of events that specify what modifications have occurred.

```typescript
const unsubscribe = formInterpreterStore.subscribe((data, events) => {
  events.forEach((event) => {
    if (event.name === "EntityValueUpdated") {
      console.log(
        "An entity value was updated.",
        event.payload.entityId,
        event.payload.value,
      );
    }
  });
});
```

## Data breakdown

You can access an interpreter store's data using the `getData` method. Example:

```typescript
formInterpreterStore.getData();
```

This will produce an output similar to:

```json
{
  "entitiesValues": {
    "51324b32-adc3-4d17-a90e-66b5453935bd": ""
  },
  "entitiesErrors": {
    "51324b32-adc3-4d17-a90e-66b5453935bd": "This field is required"
  }
}
```

- `entitiesValues`: Represents the values of entities. It can be modified using interpreter store methods such as `setEntityValue`, `resetEntityValue`, `resetEntitiesValues`, `clearEntityValue`, and `clearEntitiesValues`.

- `entitiesErrors`: Represents validation errors for various entities. It can be modified using builder store methods such as `validateEntity`, `validateEntities`, `setEntityError`, `resetEntityError`, `resetEntitiesErrors`, and `setEntitiesErrors`.

## Initial data

You can create an interpreter store with initial entities values and entities errors.

```typescript
import { createBuilderStore } from "basebuilder";

import { formBuilder } from "./form-builder";

const formInterpreterStore = createInterpreterStore(
  formBuilder,
  {
    entities: {
      "51324b32-adc3-4d17-a90e-66b5453935bd": {
        type: "textField",
        attributes: {
          label: "First name",
        },
      },
    },
    root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
  },
  {
    initialData: {
      entitiesValues: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": "Alex",
      },
      entitiesErrors: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": "Must be Alexandru",
      },
    },
  },
);
```

{% callout title="You should know!" %}
The initial entities values and entities errors will be validated for valid entity ID references.
{% /callout %}

## Default entities values

Entities values will be automatically populated with their default values during interpreter store initialization if their entity definitions have the `defaultValue` method set.

To opt out of this behavior and prevent automatic default value assignment, you can set the `initialEntitiesValuesWithDefaults` flag to `false`.

```typescript
import { createInterpreterStore } from "basebuilder";

import { formBuilder } from "./form-builder";

const formInterpreterStore = createInterpreterStore(
  formBuilder,
  {
    entities: {
      "51324b32-adc3-4d17-a90e-66b5453935bd": {
        type: "textField",
        attributes: {
          label: "First name",
        },
      },
    },
    root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
  },
  {
    initialEntitiesValuesWithDefaults: false,
  },
);
```

{% callout title="You should know!" %}
Default values will not be applied to entities that already have values provided in the initial data.
{% /callout %}
