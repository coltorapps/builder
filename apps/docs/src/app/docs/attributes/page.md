---
title: Attributes
nextjs:
  metadata:
    title: Attributes
    description: Understanding attributes.
---

Think of attributes as the props of your entities. For instance, a text field may include attributes such as a label, a requirement flag, a maximum length, and others. Attributes are atomic, enabling their reuse across various entities.

---

## Creating an attribute

You can use the `createAttribute` function to create an attribute definition.

For illustrative purposes, we're going to use [Zod](https://zod.dev/) for validation, but you're free to use any other validation library or even manually validate inputs as per your requirements.

```typescript
import { createAttribute } from "basebuilder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    return z.string().min(1).parse(value);
  },
});
```

In the example above, we've created a label attribute. Its value must be a valid string of at least one character in length.

{% callout title="You should know!" %}
The attribute value type is automatically inferred based on the returned value in the validate method, providing automatic type safety in your project.

Validations can also be asynchronous, in which case the inferred value will be the resolved type of the Promise.
{% /callout %}

## Throwing validation errors

You can throw errors, strings, objects, and virtually anything in the `validate` method of an attribute in case of an invalid value. The thrown exceptions will be automatically caught and provided to you during schema validation.

```typescript
import { createAttribute } from "basebuilder";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    if (typeof value !== "string") {
      throw "Must be a string";
    }

    if (value.length === 0) {
      throw new Error("At least 1 character");
    }

    return value;
  },
});
```

## Attribute context

The `validate` method of an attribute receives the context object as the second argument. It includes the following properties:

- `schema` {% badge content="object" /%}: The current schema, including all entities instances, against which the attribute is validated.
- `entity` {% badge content="object" /%}: The entity instance that owns the attribute.

Both the entity object and the schema are generic and not inherently type-safe because at this level, we cannot have this type of knowledge. However, you may still find the context useful on occasion.

## Transforming values

In the `validate` method of an attribute, you have the ability to return transformed values. This essentially allows you to convert the original value into a new one as needed.

```typescript
import { createAttribute } from "basebuilder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    const validatedValue = z.string().min(1).parse(value);

    return `Cool Label: ${validatedValue}`;
  },
});
```

{% callout title="You should know!" %}
Transformations are always applied exclusively when using the `validateSchema` method from the `basebuilder` package. They are intentionally not applied when validating attributes or schema via the builder store, in order to ensure a clear user experience.
{% /callout %}
