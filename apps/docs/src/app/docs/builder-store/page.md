---
title: Builder Store
nextjs:
  metadata:
    title: Builder Store
    description: Understanding builder stores.
---

A builder store serves as the central component used for constructing a schema based on a builder definition.

---

## Creating a builder store

The `createBuilderStore` method is utilized to establish a builder store based on one of your custom builders.

In most cases, you won't need to use the `createBuilderStore` method directly. Instead, you will mostly utilize the `useBuilderStore` from `@basebuilder/react`, which essentially creates the builder store for you.

This store is equipped to handle tasks such as adding entities, removing entities, reordering entities, and performing entity validation, among other functions.

```typescript
import { createBuilderStore } from "basebuilder";

import { formBuilder } from "./form-builder";

const formBuilderStore = createBuilderStore(formBuilder);
```

Now, we can start interacting with the store.

```typescript
const personalInformationSection = formBuilderStore.addEntity({
  type: "section",
  attributes: {
    tile: "Personal Information",
  },
});

formBuilderStore.addEntity({
  type: "textField",
  attributes: {
    label: "First Name",
    required: true,
  },
  parentId: personalInformationSection.id,
});

const lastNameField = formBuilderStore.addEntity({
  type: "textField",
  attributes: {
    label: "Last Name",
    required: false,
  },
  parentId: personalInformationSection.id,
});

formBuilderStore.setEntityIndex(lastNameField.id, 0);

formBuilderStore.setEntityAttribute(lastNameField.id, "required", true);
```

We have the capability to retrieve the constructed schema:

```typescript
formBuilderStore.getSchema();
```

This will be equivalent to:

```json
{
  "entities": {
    "6e0035c3-0d4c-445f-a42b-2d971225447c": {
      "type": "textField",
      "attributes": {
        "label": "First Name",
        "required": true
      },
      "parentId": "51324b32-adc3-4d17-a90e-66b5453935bd"
    },
    "4c332896-e497-47e0-98db-d39fa25f4898": {
      "type": "textField",
      "attributes": {
        "label": "Last Name",
        "required": true
      },
      "parentId": "51324b32-adc3-4d17-a90e-66b5453935bd"
    },
    "51324b32-adc3-4d17-a90e-66b5453935bd": {
      "type": "section",
      "attributes": {
        "title": "Personal Information"
      },
      "children": [
        "4c332896-e497-47e0-98db-d39fa25f4898",
        "6e0035c3-0d4c-445f-a42b-2d971225447c"
      ]
    }
  },
  "root": ["51324b32-adc3-4d17-a90e-66b5453935bd"]
}
```

## Subscribing to changes

A builder store offers a `subscribe` method that facilitates subscribing to data changes. With each change, you'll receive both the updated data and an array of events that specify what modifications have occurred.

```typescript
const unsubscribe = formBuilderStore.subscribe((data, events) => {
  events.forEach((event) => {
    if (event.name === "EntityAdded") {
      console.log("An entity was added.", event.payload.entity.id);
    }
  });
});
```

## Data breakdown

You can access a builder store's data using the `getData` method. Example:

```typescript
formBuilderStore.getData();
```

This will produce an output similar to:

```json
{
  "schema": {
    "entities": {
      "51324b32-adc3-4d17-a90e-66b5453935bd": {
        "type": "textField",
        "attributes": {
          "label": ""
        }
      }
    },
    "root": ["51324b32-adc3-4d17-a90e-66b5453935bd"]
  },
  "entitiesAttributesErrors": {
    "51324b32-adc3-4d17-a90e-66b5453935bd": {
      "label": "Must be at least one character in length"
    }
  },
  "schemaError": "Custom schema error"
}
```

- `schema`: Represents the schema containing the collection of all entity instances and their order. It can be modified using builder store methods such as `addEntity`, `deleteEntity`, `setEntityParent`, `unsetEntityParent`, `setEntityIndex`, `setEntityAttribute`, and `cloneEntity`.

- `entitiesAttributesErrors`: Represents validation errors of various entity attributes. It can be modified using builder store methods such as `validateEntityAttribute`, `validateEntityAttributes`, `validateEntitiesAttributes`, `resetEntityAttributeError`, `setEntityAttributeError`, `resetEntityAttributesErrors`, `setEntityAttributesErrors`, `resetEntitiesAttributesErrors`, `setEntitiesAttributesErrors`, and `validateSchema`. When you delete an entity, its attribute errors will also be deleted.

- `schemaError`: Represents a global schema validation error, which originates from the [`validateSchema` method on your builder](/docs/builders#additional-schema-validation). It can be modified using builder store methods like `validateSchema`, `setSchemaError`, and `resetSchemaError`.

## Initial data

You can create a builder store with an initial schema, entity attribute errors, and schema error.

```typescript
import { createBuilderStore } from "basebuilder";

import { formBuilder } from "./form-builder";

const formBuilderStore = createBuilderStore(formBuilder, {
  initialData: {
    schema: {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "textField",
          attributes: {
            label: "",
          },
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
    },
    entitiesAttributesErrors: {
      "51324b32-adc3-4d17-a90e-66b5453935bd": {
        label: "Must be at least one character in length",
      },
    },
    schemaError: "Custom schema error",
  },
});
```

{% callout title="You should know!" %}
The initial schema will be synchronously validated for integrity, and the initial attribute errors will be validated for valid entity ID references and valid attribute keys.
{% /callout %}
