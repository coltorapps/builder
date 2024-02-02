---
title: createBuilder
nextjs:
  metadata:
    title: createBuilder
    description: API Reference of createBuilder.
---

This function creates a builder definition that can be used for building, validating and interpreting schemas.

By a builder definition, we simply mean an object with specific properties. The function itself serves primarily as a type safety helper and doesn't perform any underlying logic.

## Reference

### `createBuilder(options)`

Use the `createBuilder` function to create a builder definition.

```typescript
import { createBuilder } from "@coltorapps/builder";

import { selectFieldEntity, textFieldEntity } from "./entities";

export const formBuilder = createBuilder({
  entities: [textFieldEntity, selectFieldEntity],
});
```

### Parameters

`createBuilder` accepts a single parameter, which should be an object containing the following properties:

| Property             | Type                                                            | Description {% class="api-description" %}                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entities`           | {% badge content="array" /%}                                    | An array of [entities definitions](/docs/api/create-entity) used for building and validating schemas.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `generateEntityId`   | {% badge content="function" /%} {% badge content="optional" /%} | An optional function for generating entities IDs, which is invoked when adding new entities to the schema. It defaults to `() => string` and returns UUIDs by default, by leveraging the `node:crypto` module or the global `crypto` module when possible. If your app is running in an environment that doesn't natively support these modules, this function is useful for implementing your own UUID generation logic, or alternatively, you may opt to generate a completely different type of identifier. |
| `validateEntityId`   | {% badge content="function" /%} {% badge content="optional" /%} | An optional function for validating entities IDs. This function is invoked for each entity in the schema during schema validation, receiving the entity ID of each respective entity. Any exceptions it raises will be automatically caught during schema validation. It defaults to `() => void` and verifies that IDs are in UUID format. Alternatively, you can opt to validate a completely different format of identifier.                                                                                |
| `validateSchema`     | {% badge content="function" /%} {% badge content="optional" /%} | An optional function adding custom validation logic that is invoked during schema validation after all base validations, which receives the current schema for validation. It can be asynchronous, and any exceptions it raises will be automatically caught and stored in the builder store, or returned back to you when validating the schema inline. Defaults to `() => void`.                                                                                                                             |
| `entitiesExtensions` | {% badge content="object" /%} {% badge content="optional" /%}   | An optional object for extending or overriding the attribute validations of specific entities, or for altering certain configurations of specific entities. It defaults to `{}`. See below for [structure details](#entities-extensions).                                                                                                                                                                                                                                                                      |

### Returns

The `createBuilder` function essentially forwards the provided `options` parameter as the returned object and doesn't perform any underlying logic, with optional parameters falling back to the defaults described above when not provided.

| Property             | Type                            | Description {% class="api-description" %}                                               |
| -------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| `entities`           | {% badge content="array" /%}    | An array of [entities definitions](/docs/api/create-entity).                            |
| `generateEntityId`   | {% badge content="function" /%} | A function for generating entities IDs.                                                 |
| `validateEntityId`   | {% badge content="function" /%} | A function for validating entities IDs.                                                 |
| `validateSchema`     | {% badge content="function" /%} | A function for additional schema validation.                                            |
| `entitiesExtensions` | {% badge content="object" /%}   | An object for extending or overriding attribute validations or entities configurations. |

Usually, you will not need to manually access these properties; instead, the created builder definition object is typically used for creating builder stores, interpreter stores, and for schema validation.

### Entities Extensions

Extending or overriding attribute validations or entities configurations can be achieved using the `entitiesExtensions` property when creating a builder definition, which is a deeply partial object of the following shape:

```typescript
{
  // The key is the name of one of the entities.
  entityName?: {
    // Determines whether the entity can or cannot have any
    // child entities. It can also be an array of entities
    // names for constraining the relationships.
    childrenAllowed?: boolean | string[];
    // Determines whether the entity must always have
    // a parent entity.
    parentRequired?: boolean;
    // An array of entities names that are allowed to be
    // the parent of this entity.
    allowedParents?: string[];
    // Attributes extensions.
    attributes?: {
      // The key corresponds to the name of an attribute.
      attributeName?: {
        // The logic for validating the attribute's value.
        validate?: (value, context) => TValue
      }
    }
  }
}
```

The `validate` method in an attribute's extension receives the same arguments as the base `validate` method of the attribute, except the [context object](/docs/api/create-attribute#context) also includes an additional `context.validate(value)` method, which essentially represents the base validation of the attribute, or the extended validation of the attribute in the entity definition (refer to [Attributes Extensions](/docs/api/create-entity#attributes-extensions) in the `createEntity` API reference). Invoking it is optional, allowing you to entirely replace the validation with custom logic.

The return type of the new validation must match the return type of the attribute's base `validate` method.
