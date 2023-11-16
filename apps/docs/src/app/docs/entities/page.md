---
title: Entities
nextjs:
  metadata:
    title: Entities
    description: Understanding entities.
---

Think of entities with attributes as components with props. For instance, you can define a text field entity and later add multiple instances of text fields to a form. Entities are atomic, enabling their reuse across different builders.

---

## Creating an entity

For illustrative purposes, we're going to use [Zod](https://zod.dev/) for validation, but you're free to use any other validation library or even manually validate inputs as per your requirements.

```typescript
import { createEntity } from "basebuilder";
import { z } from "zod";

import { labelAttribute } from "./label-attribute";

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [labelAttribute],
  validate(value) {
    return z.string().optional().parse(value);
  },
});
```

In the example above, we've created a text field entity with a label attribute. Its value must be an optional, yet valid, string.

{% callout title="You should know!" %}
The entity value type is automatically inferred based on the returned value in the validate method, providing automatic type safety in your project.

Validations can also be asynchronous, in which case the inferred value will be the resolved type of the Promise.
{% /callout %}

## Throwing validation errors

You can throw errors, strings, objects, and virtually anything in the `validate` method of an entity in case of an invalid value. The thrown exceptions will be automatically caught and provided to you during schema validation.

```typescript
import { createEntity } from "basebuilder";

export const textFieldEntity = createEntity({
  name: "textField",
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

## Entity context

Every entity method, such as `validate`, `defaultValue`, and `shouldBeProcessed`, receives the context object as an argument. It includes the following properties:

- `entity` {% badge content="object" /%}: Represents the current entity instance.
- `entitiesValues` {% badge content="object" /%}: Contains the values of all entities instances.

## Using attributes during validation

Since entities are configurable via attributes, most of the time, the validation of entities will also vary depending on their attributes.

Let's define a `required` attribute for the text field entity and validate the entity's value depending on this attribute's value from the context.

```typescript
import { createAttribute, createEntity } from "basebuilder";
import { z } from "zod";

export const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().parse(value);
  },
});

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [requiredAttribute],
  validate(value, context) {
    const schema = z.string();

    if (context.entity.attributes.required) {
      return schema.min(1).parse(value);
    }

    return schema.optional().parse(value);
  },
});
```

In summary, when the `required` attribute of a particular text field is set to true, the value of this text field must be a valid string of at least one character in length. Otherwise, the value can be either undefined or an empty string.

## Extending attributes validations

Sometimes, we want the validation of an attribute's value to depend on the value of another attribute. Since attributes are atomic, they cannot yet know in which entities they will be used or what other attributes will accompany them in an entity. That's why the custom validation of interdependent attributes is delegated one level up, to the entity. The entity already has knowledge of all its possible attributes, providing you with type safety when writing validations for interdependent attributes.

For example, let's consider a text field with min and max length attributes. We want to ensure that the min length is less than the max length, and the max length is greater than the min length.

```typescript
import { createAttribute, createEntity } from "basebuilder";
import { z } from "zod";

export const minLengthAttribute = createAttribute({
  name: "minLength",
  validate(value) {
    return z.number().parse(value);
  },
});

export const maxLengthAttribute = createAttribute({
  name: "maxLength",
  validate(value) {
    return z.number().parse(value);
  },
});

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [minLengthAttribute, maxLengthAttribute],
  validate(value, context) {
    return z
      .string()
      .min(context.entity.attributes.minLength)
      .max(context.entity.attributes.maxLength)
      .parse(value);
  },
  attributesExtensions: {
    minLength: {
      validate(value, context) {
        const minLength = context.validate(value); // valid number

        if (minLength > context.entity.attributes.maxLength) {
          throw "Must be equal to or less than the max length";
        }

        return validatedValue;
      },
    },
    maxLength: {
      validate(value, context) {
        const maxLength = context.validate(value); // valid number

        if (maxLength < context.entity.attributes.minLength) {
          throw "Must be equal to or greater than the min length";
        }

        return validatedValue;
      },
    },
  },
});
```

Notice how we're calling `context.validate(value)`, which is essentially the base validation of the attribute. Calling it is optional, allowing you to override the validation entirely with custom logic.

{% callout title="You should know!" %}
When extending an attribute's validation at the entity level, the return type of the new validation must match the return type of the attribute's base `validate` method.
{% /callout %}

## Relationships constraints

We can enforce that an entity must always have a parent using the `parentRequired` attribute. For example, we want the text field entity to always be a child of another entity and never exist at the root level of the entity hierarchy.

```typescript
import { createEntity } from "basebuilder";

export const textFieldEntity = createEntity({
  name: "textField",
  parentRequired: true,
});
```

If we want to allow an entity to have child entities, we can achieve this using the `childrenAllowed` attribute. For example, we may want to create section entities that can contain fields within them.

```typescript
import { createEntity } from "basebuilder";

export const sectionEntity = createEntity({
  name: "section",
  childrenAllowed: true,
});
```

## Default value

We can compute a default value for an entity by utilizing the `defaultValue` method, which has access to the context and, consequently, to all attributes. For example, we want to allow the user to specify the default value of a text field.

```typescript
import { createAttribute, createEntity } from "basebuilder";
import { z } from "zod";

export const defaultValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    return z.string().optional().parse(value);
  },
});

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [defaultValueAttribute],
  validate(value, context) {
    return z.string().optional().parse(value);
  },
  defaultValue(context) {
    return context.entity.attributes.defaultValue;
  },
});
```

We have defined a default value attribute for the text field entity, and its value is accessed by the `defaultValue` method through the context.

{% callout title="You should know!" %}
The return type of the `defaultValue` method must match the return type of the `validate` method, but it can also return `undefined`.
{% /callout %}

## Conditional processing

An entity can be conditionally hidden from the UI and excluded from all validations, both on the client and server, by using the `shouldBeProcessed` method. This method must return either `true` or `false`, indicating whether the entity should be displayed and validated, or not. By default, it always returns `true`.

This method can be useful for establishing conditional entities that depend on other entities. For instance, you may want to display a text field only when another text field has been filled.

```typescript
import { createAttribute, createEntity } from "basebuilder";
import { z } from "zod";

export const referenceEntityIdAttribute = createAttribute({
  name: "referenceEntityId",
  validate(value, context) {
    const referenceId = z.string().uuid().optional().parse(value);

    if (!referenceId) {
      return referenceId;
    }

    if (!context.schema.entities[referenceId]) {
      throw "Must reference an existing entity";
    }

    if (referenceId === context.entity.id) {
      throw "Self-referencing not allowed";
    }

    return referenceId;
  },
});

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [referenceEntityIdAttribute],
  validate(value, context) {
    return z.string().optional().parse(value);
  },
  shouldBeProcessed(context) {
    const { referenceEntityId } = context.entity.attributes;

    if (!referenceEntityId) {
      return true;
    }

    const referencedEntityValue = context.entitiesValues[referenceEntityId];

    return Boolean(referencedEntityValue);
  },
});
```

We have defined a `referenceEntityId` attribute for the text field entity, whose value essentially holds a reference to an entity ID from the schema. The attribute's value must be an optional, but valid UUID, referencing an existing entity, and it should not self-reference the same entity.

In the `shouldBeProcessed` method, we return `true` if `referenceEntityId` has not been set. Otherwise, we retrieve the value of the entity with an ID matching the `referenceEntityId` attribute value from the context and return its boolean equivalent.

{% callout title="You should know!" %}
If the `shouldBeProcessed` method of a parent entity returns `false`, and it contains nested entities, those entities are also excluded from validation.
{% /callout %}

## Transforming values

In the `validate` method of an entity, you have the ability to return transformed values. This essentially allows you to convert the original value into a new one as needed.

```typescript
import { createEntity } from "basebuilder";
import { z } from "zod";

export const textFieldEntity = createEntity({
  name: "textField",
  validate(value) {
    const validatedValue = z.string().optional().parse(value);

    return validatedValue || "Placeholder value";
  },
});
```

{% callout title="You should know!" %}
Transformations are always applied exclusively when using the `validateEntitiesValues` method from the `basebuilder` package. They are intentionally not applied when validating entities values via the interpreter store, in order to ensure a clear user experience.
{% /callout %}
