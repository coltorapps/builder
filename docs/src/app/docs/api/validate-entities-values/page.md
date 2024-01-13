---
title: validateEntitiesValues
nextjs:
  metadata:
    title: validateEntitiesValues
    description: API Reference of validateEntitiesValues.
---

This function ensures that the input values are valid in conjunction with the builder you've defined for constructing the schema and the schema itself.

## Reference

### `validateEntitiesValues(values, builder, schema)`

Use the `validateEntitiesValues` function to validate the input values:

```typescript
"use server";

import { validateEntitiesValues } from "basebuilder";

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

export async function validateFormSubmission(values: FormData) {
  const result = await validateEntitiesValues(
    Object.entries(values),
    formBuilder,
    formSchema,
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

In the example above, we've hardcoded the schema, but typically, you would retrieve it from a database, for instance.

### Parameters

`validateEntitiesValues` accepts three parameters:

| Parameter | Type                          | Description                                                                  |
| --------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `values`  | {% badge content="object" /%} | The values that need to be validated.                                        |
| `builder` | {% badge content="object" /%} | The [builder definition](/docs/api/create-builder) used to build the schema. |
| `schema`  | {% badge content="object" /%} | The schema that was interpreted and utilized for populating values.          |

### Returns

`validateEntitiesValues` returns a union of two possible objects, depending on the validation outcome. This function never throws errors, meaning that you only need to narrow down its result based on the value of the `success` key.

In case of successful validation, you receive the following object:

| Property  | Type                           | Description                                                   |
| --------- | ------------------------------ | ------------------------------------------------------------- |
| `success` | {% badge content="boolean" /%} | Set to `true`, indicating that the validation was successful. |
| `data`    | {% badge content="object" /%}  | The validated values.                                         |

In case of failed validation, you receive the following object:

| Property         | Type                           | Description                                                                                                    |
| ---------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `success`        | {% badge content="boolean" /%} | Set to `false`, indicating that the validation failed.                                                         |
| `entitiesErrors` | {% badge content="object" /%}  | An object that contains validation errors thrown by your validators, corresponding to invalid entities values. |
