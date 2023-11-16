---
title: createEntity
nextjs:
  metadata:
    title: createEntity
    description: API Reference of createEntity.
---

This function creates an entity definition that can be subsequently referenced in multiple builders.

By an entity definition, we simply mean an object with specific properties. The function itself serves primarily as a type safety helper and doesn't perform any underlying logic.

## Reference

### `createEntity(options)`

Use the `createEntity` function to create an entity definition.

```typescript
import { createEntity } from "basebuilder";

import { labelAttribute } from "./label-attribute";

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [labelAttribute],
  validate(value) {
    if (typeof value !== "string") {
      throw new Error("Must be a string");
    }

    return value;
  },
});
```

### Parameters

`createEntity` accepts a single parameter, which should be an object containing the following properties:

- `name` {% badge content="string" /%}: The entity's name, which appears as the `type` property on entities instances within the schema.
- `attributes` {% badge content="optional" /%} {% badge content="array" /%}: The array of attributes definitions.
- `validate` {% badge content="optional" /%} {% badge content="function" /%}: An optional validation function for checking entity values during schema validation. It can be asynchronous, and any exceptions it raises will be automatically caught and provided to you during values validation. The method receives two arguments: the entity's value and the [context object](#context). Not defining this method implies that the entity cannot have a value.
- `childrenAllowed` {% badge content="optional" /%} {% badge content="boolean" /%}: An optional flag for determining whether the entity can or cannot have any child entities. Defaults to `false`.
- `parentRequired` {% badge content="optional" /%} {% badge content="boolean" /%}: An optional flag for indicating whether the entity must always have a parent entity. Defaults to `false`.
- `defaultValue` {% badge content="optional" /%} {% badge content="function" /%}: An optional function for populating the entity's value with a default during the interpreter store initialization. It receives the [context object](#context) as an argument. The return type of this method must match the return type of the `validate` method, but it can also return `undefined`. This method has no effect when the `validate` method is not defined. Defaults to `() => undefined`.
- `shouldBeProcessed` {% badge content="optional" /%} {% badge content="function" /%}: An optional function that should return either `true` or `false`, indicating whether both the entity and all its child entities should be displayed and validated or not. Defaults to `() => true`.
- `attributesExtensions` {% badge content="optional" /%} {% badge content="object" /%}: An optional object for extending or overriding attributes validations. The `validate` method in an attribute's extension receives the same arguments as the base `validate` method of the attribute. You can fully override the attribute's validation by not calling `context.validate()`. The return type of the new validation must match the return type of the attribute's base `validate` method. Example:

```typescript
import { createEntity } from "basebuilder";

import { titleAttribute } from "./title-attribute";

export const sectionEntity = createEntity({
  name: "section",
  attributes: [titleAttribute],
  attributesExtensions: {
    title: {
      validate(value, context) {
        const title = context.validate(value);

        if (title.length < 5) {
          throw new Error(
            "The title must be greater than or equal to 5 characters in length.",
          );
        }

        return title;
      },
    },
  },
});
```

### Returns

The `createEntity` function essentially forwards the provided `options` parameter as the returned object.

## Context

The `context` object is passed as an argument to the `validate`, `defaultValue`, and `shouldBeProcessed` methods within the `createEntity` function. It includes the following properties:

- `entity` {% badge content="object" /%}: The entity instance.
- `entitiesValues` {% badge content="object" /%}: The values of all entities.
