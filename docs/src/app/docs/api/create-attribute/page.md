---
title: createAttribute
nextjs:
  metadata:
    title: createAttribute
    description: API Reference of createAttribute.
---

This function creates an attribute definition that can be subsequently referenced in multiple entities' definitions.

By an attribute definition, we simply mean an object with specific properties. The function itself serves primarily as a type safety helper and doesn't perform any underlying logic.

## Reference

### `createAttribute(options)`

Use the `createAttribute` function to create an attribute definition.

```typescript
import { createAttribute } from "basebuilder";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value, context) {
    if (typeof value !== "string") {
      throw new Error("Must be a string");
    }

    return value;
  },
});
```

### Parameters

`createAttribute` accepts a single parameter, which should be an object containing the following properties:

| Property   | Type                            | Description {% class="api-description" %}                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | {% badge content="string" /%}   | The attribute's name.                                                                                                                                                                                                                                                                                                                                    |
| `validate` | {% badge content="function" /%} | A validation function for checking attribute values during schema validation. It can be asynchronous, and any exceptions it raises will be automatically caught and stored in the builder store, or returned back to you when validating the schema inline. The method receives two arguments: the attribute's value and the [context object](#context). |

### Returns

The `createAttribute` function essentially forwards the provided `options` parameter as the returned object and doesn't perform any underlying logic..

| Property   | Type                            | Description {% class="api-description" %}                                     |
| ---------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `name`     | {% badge content="string" /%}   | The attribute's name.                                                         |
| `validate` | {% badge content="function" /%} | A validation function for checking attribute values during schema validation. |

Usually, you will not need to manually access these properties; instead, the created attribute definition object is typically passed directly to an entity definition.

## Context

The `context` object is passed as an argument to the `validate` method within the `createAttribute` function, and it contains the following properties:

| Property | Type                          | Description {% class="api-description" %}                                                                       |
| -------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `schema` | {% badge content="object" /%} | The current generic schema, including all generic entities instances, against which the attribute is validated. |
| `entity` | {% badge content="object" /%} | The generic entity instance that owns the attribute.                                                            |
