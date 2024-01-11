---
title: validateSchema
nextjs:
  metadata:
    title: validateSchema
    description: API Reference of validateSchema.
---

This async function validates that the input schema meets several essential requirements based on the provided builder, such as having a valid structure, correct references in relationships, proper relationship constraints, valid attributes, accurate entity types, and valid IDs.

In most cases, you'll call this function on the server side to validate the incoming built schema from the client.

## Reference

### `validateSchema(schema, builder)`

Use the `validateSchema` function to validate the input schema:

```typescript
"use server";

import { validateSchema } from "basebuilder";

import { formBuilder } from "./form-builder";

export async function validateFormSchema(schema: unknown) {
  const result = await validateSchema(schema, formBuilder);

  if (result.success) {
    // The result.data contains a valid schema
    // that can be stored in the database.
  } else {
    // The result.reason holds the reason for
    // validation failure.
  }
}
```

### Parameters

`validateSchema` accepts two parameters:

| Parameter | Type                          | Description                                                                  |
| --------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `schema`  | {% badge content="object" /%} | The schema that needs to be validated.                                       |
| `builder` | {% badge content="object" /%} | The [builder definition](/docs/api/create-builder) used to build the schema. |

### Returns

`validateSchema` returns a union of two possible objects, depending on the validation outcome. This function never throws errors, meaning that you only need to narrow down its result based on the value of the `success` key.

In case of successful validation, you receive the following object:

| Property  | Type                           | Description                                                   |
| --------- | ------------------------------ | ------------------------------------------------------------- |
| `success` | {% badge content="boolean" /%} | Set to `true`, indicating that the validation was successful. |
| `data`    | {% badge content="object" /%}  | The validated schema.                                         |

In case of failed validation, you receive the following object:

| Property  | Type                           | Description                                            |
| --------- | ------------------------------ | ------------------------------------------------------ |
| `success` | {% badge content="boolean" /%} | Set to `false`, indicating that the validation failed. |
| `reason`  | {% badge content="object" /%}  | An object describing the failure's reason.             |

The `reason` object will contain the following properties:

| Property  | Type                                                          | Description                                                               |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `code`    | {% badge content="string" /%}                                 | An enum of possible [error codes](#error-codes) describing the reason.    |
| `payload` | {% badge content="object" /%} {% badge content="optional" /%} | An optional object containing additional information based on the `code`. |

### Error Codes

In case of a failed validation, the failure reason `code` can be one of the following:

| Error Code                      | Description                                             |
| ------------------------------- | ------------------------------------------------------- |
| `InvalidRootFormat`             | The root must be an array of strings.                   |
| `DuplicateRootId`               | Duplicate IDs detected in the root.                     |
| `DuplicateChildId`              | Duplicate IDs detected in the children.                 |
| `RootEntityWithParent`          | Root entities can't have a parent.                      |
| `EmptyRoot`                     | The root must contain at least one entity.              |
| `NonexistentEntityId`           | A provided entity ID does not exist.                    |
| `InvalidEntitiesFormat`         | Entities should be an object containing valid entities. |
| `MissingEntityType`             | Entity type is missing.                                 |
| `UnknownEntityType`             | The provided entity type is unknown.                    |
| `InvalidChildrenFormat`         | The provided children are invalid.                      |
| `NonexistentEntityParent`       | The parent ID references a non-existent entity.         |
| `MissingEntityAttributes`       | Entity attributes are missing.                          |
| `InvalidEntityAttributesFormat` | The provided entity attributes are invalid.             |
| `UnknownEntityAttributeType`    | The provided entity attribute type is unknown.          |
| `SelfEntityReference`           | Self entity reference.                                  |
| `ChildNotAllowed`               | Child is not allowed.                                   |
| `EntityChildrenMismatch`        | Children relationship mismatch.                         |
| `EntityParentMismatch`          | Parent relationship mismatch.                           |
| `ParentRequired`                | A parent is required.                                   |
| `ParentNotAllowed`              | Parent is not allowed.                                  |
| `UnreachableEntity`             | The entity is not in the root and has no parent ID.     |
| `InvalidEntitiesAttributes`     | Validation has failed for some entities attributes.     |
| `InvalidSchema`                 | Custom schema validation has failed.                    |

Most of the time, when validating your schema on the server side, you will likely want to address `InvalidEntitiesAttributes` and, if applicable, `InvalidSchema`.
