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
import { createEntity } from "@coltorapps/builder";

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

| Property               | Type                                                            | Description {% class="api-description" %}                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                 | {% badge content="string" /%}                                   | The entity's name, which appears as the `type` property on entities instances within the schema.                                                                                                                                                                                                                                                                                                                                                                  |
| `attributes`           | {% badge content="array" /%} {% badge content="optional" /%}    | An optional array of [attributes definitions](/docs/api/create-attribute). Defaults to `[]`.                                                                                                                                                                                                                                                                                                                                                                      |
| `validate`             | {% badge content="function" /%} {% badge content="optional" /%} | An optional validation function for checking entity values during schema validation. It can be asynchronous, and any exceptions it raises will be automatically caught and stored in the builder store, or returned back to you when validating the schema inline. The method receives two arguments: the entity's value and the [context object](#context). Not defining this method implies that the entity cannot have a value. Defaults to `() => undefined`. |
| `childrenAllowed`      | {% badge content="boolean" /%} {% badge content="optional" /%}  | An optional flag for determining whether the entity can or cannot have any child entities. Defaults to `false`.                                                                                                                                                                                                                                                                                                                                                   |
| `parentRequired`       | {% badge content="boolean" /%} {% badge content="optional" /%}  | An optional flag for indicating whether the entity must always have a parent entity. Defaults to `false`.                                                                                                                                                                                                                                                                                                                                                         |
| `defaultValue`         | {% badge content="function" /%} {% badge content="optional" /%} | An optional function for populating the entity's value with a default during the interpreter store initialization. It receives the [context object](#context) as an argument. The return type of this method must match the return type of the `validate` method, but it can also return `undefined`. This method has no effect when the `validate` method is not defined. Defaults to `() => undefined`.                                                         |
| `shouldBeProcessed`    | {% badge content="function" /%} {% badge content="optional" /%} | An optional function that should return either `true` or `false`, indicating whether both the entity and all its child entities should be displayed and validated or not. It receives the [context object](#context) as an argument. Defaults to `() => true`.                                                                                                                                                                                                    |
| `attributesExtensions` | {% badge content="object" /%} {% badge content="optional" /%}   | An optional object for extending or overriding attribute validations. Defaults to {}. See below for [structure details](#attributes-extensions).                                                                                                                                                                                                                                                                                                                  |

### Returns

The `createEntity` function essentially forwards the provided `options` parameter as the returned object and doesn't perform any underlying logic, with optional parameters falling back to the defaults described above when not provided.

| Property               | Type                            | Description {% class="api-description" %}                                                                                                                                 |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                 | {% badge content="string" /%}   | The entity's name.                                                                                                                                                        |
| `attributes`           | {% badge content="array" /%}    | An array of [attributes definitions](/docs/api/create-attribute).                                                                                                         |
| `validate`             | {% badge content="function" /%} | A validation function for checking entity values during schema validation.                                                                                                |
| `childrenAllowed`      | {% badge content="boolean" /%}  | A flag which determines whether the entity can or cannot have any child entities.                                                                                         |
| `parentRequired`       | {% badge content="boolean" /%}  | A flag which determines whether the entity must always have a parent entity.                                                                                              |
| `defaultValue`         | {% badge content="function" /%} | A function for populating the entity's value with a default during the interpreter store initialization.                                                                  |
| `shouldBeProcessed`    | {% badge content="function" /%} | A function that determines whether both the entity and all its child entities should be displayed and validated or not.                                                   |
| `attributesExtensions` | {% badge content="object" /%}   | An object for extending or overriding attribute validations.                                                                                                              |
| `valueAllowed`         | {% badge content="boolean" /%}  | A flag that indicates whether the entity is allowed to have values. It is set to `true` only when the `validate` method was provided when creating the entity definition. |

Usually, you will not need to manually access these properties; instead, the created entity definition object is typically passed directly to a builder definition.

## Context

The `context` object is passed as an argument to the `validate`, `defaultValue`, and `shouldBeProcessed` methods within the `createEntity` function. It includes the following properties:

| Property         | Type                          | Description {% class="api-description" %}                |
| ---------------- | ----------------------------- | -------------------------------------------------------- |
| `entity`         | {% badge content="object" /%} | The entity instance.                                     |
| `entitiesValues` | {% badge content="object" /%} | The values of all entities during schema interpretation. |

### Attributes Extensions

Extending or overriding attribute validations can be achieved using the `attributesExtensions` property when creating an entity definition, which is a deeply partial object of the following shape:

```typescript
{
  // The key corresponds to the name of an attribute.
  attributeName?: {
    // The logic for validating the attribute's value.
    validate?: (value, context) => TValue
  }
}
```

The `validate` method in an attribute's extension receives the same arguments as the base `validate` method of the attribute, except the [context object](/docs/api/create-attribute#context) also includes an additional `context.validate(value)` method, tessentially represents the base validation of the attribute. Invoking it is optional, allowing you to entirely replace the validation with custom logic.

The return type of the new validation must match the return type of the attribute's base `validate` method.
