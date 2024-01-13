---
title: Entities values
nextjs:
  metadata:
    title: Entities values
    description: Understanding values.
---

Entities values are the result of user input within the context of an interpreted schema.

---

## Entities values breakdown

Consider the following schema:

```json
{
  "entities": {
    "51324b32-adc3-4d17-a90e-66b5453935bd": {
      "type": "textField",
      "attributes": {
        "label": "First name"
      }
    },
    "d5ae8682-156c-4511-b972-98c6c3b7c41b": {
      "type": "textField",
      "attributes": {
        "label": "Last name"
      }
    }
  },
  "root": [
    "51324b32-adc3-4d17-a90e-66b5453935bd",
    "d5ae8682-156c-4511-b972-98c6c3b7c41b"
  ]
}
```

Here is a possible outcome of entities values:

```json
{
  "51324b32-adc3-4d17-a90e-66b5453935bd": "Alexandru",
  "d5ae8682-156c-4511-b972-98c6c3b7c41b": "Stratulat"
}
```

{% callout title="You should know!" %}
Entities values are always structured as a single-level flat format, mirroring the philosophy of `FormData`.
{% /callout %}

## Validation

Once the user fills out a form, the entities values can be sent to the server for validation and storage in the database.

To validate a schema on the server-side, you can utilize the `validateEntitiesValues` method in conjunction with the builder you've defined for constructing the schema and the schema itself.

```typescript
"use server";

import { validateEntitiesValues, validateSchema } from "basebuilder";

import db from "./db";
import { formBuilder } from "./form-builder";

export async function validateFormSubmission(values: FormData, formId: string) {
  const form = await db.form.findFirstOrThrow({
    where: {
      id: formId,
    },
  });

  const formSchemaValidationResult = await validateSchema(
    form.schema,
    formBuilder,
  );

  if (!formSchemaValidationResult.success) {
    throw Error("The schema is not valid anymore.");
  }

  const result = await validateEntitiesValues(
    Object.entries(values),
    formBuilder,
    formSchemaValidationResult.data,
  );

  if (result.success) {
    // The result.data contains valid values
    // that can be stored in the database.
  } else {
    // The result.entitiesErrors object 
    // contains validation errors corresponding 
    // to invalid entities values.
  }
}
```

In summary, `validateEntitiesValues` ensures that the values are valid according to your defined entity validations and maintain references to valid entity IDs from the schema.

{% callout title="You should know!" %}
Value transformations will be applied when utilizing the `validateEntitiesValues` method, as indicated in [the entities documentation](/docs/entities#transforming-values).

Additionally, entities that are not processable will be excluded from validation and filtered out, along with their children, as explained in [the entities documentation](/docs/entities#conditional-processing).
{% /callout %}
