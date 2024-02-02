---
title: Schema
nextjs:
  metadata:
    title: Schema
    description: Understanding schemas.
---

A schema is essentially a JSON structure created through a specific builder, which contains a collection of entities instances and their order.

---

## Schema breakdown

Consider the following builder:

```typescript
import { createBuilder } from "@coltorapps/builder";

import { sectionEntity } from "./section-entity";
import { textFieldEntity } from "./text-field-entity";

export const formBuilder = createBuilder({
  entities: [textFieldEntity, sectionEntity],
});
```

Using the above builder, we can construct the following example schema:

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
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "4c332896-e497-47e0-98db-d39fa25f4898"
      ]
    }
  },
  "root": ["51324b32-adc3-4d17-a90e-66b5453935bd"]
}
```

The schema consists of two main keys: `entities` and `root`.

The `entities` key contains objects representing entities instances supported by the builder, like text fields and sections. They are uniquely identified by an ID, and each of these objects includes:

- `type`: The name of the entity definition.
- `attributes`: Attributes values.
- `parentId` {% badge content="optional" /%}: Holds a reference to the ID of the parent entity.
- `children` {% badge content="optional" /%}: Represents an array of entities IDs specifying the order of children within a parent entity.

The `root` key is an array that holds the top-level entities in the hierarchy, determining their order.

## Validation

Once the user creates a form, a corresponding schema is sent to the server for validation and storage in the database.

To validate a schema on the server-side, you can utilize the `validateSchema` method, in conjunction with the builder you've defined for constructing the schema.

```typescript
"use server";

import { validateSchema } from "@coltorapps/builder";

import { formBuilder } from "./form-builder";

export async function validateFormSchema(schema: unknown) {
  const result = await validateSchema(schema, formBuilder);

  if (result.success) {
    /*
    | The `result.data` contains a valid schema
    | that can be stored in the database.
    */
  } else {
    /*
    | The `result.reason` holds the reason for
    | validation failure.
    */
  }
}
```

In summary, `validateSchema` checks that the input schema meets several essential requirements, such as having a valid structure, correct references in relationships, proper relationship constraints, valid attributes, accurate entity types, and valid IDs.

Subsequently, this schema can be retrieved from the server and "interpreted" on the client side, enabling users to fill and submit the form.

{% callout title="You should know!" %}
Schema transformations will be applied when utilizing the `validateSchema` method, as indicated in [the builder documentation](/docs/builders#transforming-schemas).
{% /callout %}

## Shape validation

To validate a schema's shape synchronously, you can use the `validateSchemaShape` method. This method performs the same validation as the `validateSchema` method but does not validate attributes values and skips the custom schema validation. It can be beneficial in specific scenarios.

```typescript
import { validateSchemaShape } from "@coltorapps/builder";

const result = validateSchemaShape(schema, formBuilder);

if (result.success) {
  // The result.data contains a valid schema
  // that can be stored in the database.
} else {
  // The result.reason holds the reason for
  // validation failure.
}
```

{% callout title="You should know!" %}
Schema's shape is consistently validated synchronously under the hood when instantiating both builder stores and interpreter stores.
{% /callout %}
