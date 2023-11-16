---
title: createAttribute
nextjs:
  metadata:
    title: createAttribute
    description: API Reference of createAttribute.
---

This method creates an attribute definition that can be subsequently referenced in multiple entities' definitions. By an attribute definition, we simply mean an object with specific properties.

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

- `name` {% badge content="string" /%}: The attribute's name, which appears as the `type` property on entities instances within the schema.
- `validate` {% badge content="function" /%}: A validation function for checking attribute values during schema validation. It can be asynchronous, and any exceptions it raises will be automatically caught and provided to you during schema validation. The function accepts two parameters: the attribute's value and a context object, which includes the following properties:
  - `schema` {% badge content="object" /%}: The current schema, including all entities instances, against which the attribute's owning entity is validated.
  - `entity` {% badge content="object" /%}: The entity instance that owns the attribute.

### Returns

The `createAttribute` function essentially forwards the provided `options` parameter as the returned object.
