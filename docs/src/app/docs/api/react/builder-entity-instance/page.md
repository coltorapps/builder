---
title: BuilderEntityInstance
nextjs:
  metadata:
    title: BuilderEntityInstance
    description: API Reference of BuilderEntityInstance.
---

This interface describes the properties of a builder entity instance, which is usually injected as a prop into [builder entities components](/docs/api/react/builder-entity-component-props).

## Reference

### `BuilderEntityInstance<TEntity>` {% class="break-all" %}

```tsx
import { type BuilderEntityInstance } from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

type BuilderTextFieldInstance = BuilderEntityInstance<typeof textFieldEntity>;
```

### Properties

The `BuilderEntityInstance` interfaces has the following properties:

| Prop                          | Type                                                          | Description {% class="api-description" %}                                                                                     |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`                          | {% badge content="string" /%}                                 | The unique identifier of the entity.                                                                                          |
| `type`                        | {% badge content="string" /%}                                 | The type identifier of the entity. Corresponds to the key of the entity definition in the builder definition.                 |
| `children`                    | {% badge content="array" /%} {% badge content="optional" /%}  | Optional array of child entity IDs.                                                                                           |
| `parentId`                    | {% badge content="string" /%} {% badge content="optional" /%} | Optional ID of the parent entity. If undefined, the entity is considered a root-level entity.                                 |
| `attributes`                  | {% badge content="object" /%}                                 | A record of all [attribute instances](/docs/api/react/attribute-instance) for the entity, keyed by attribute name.            |
| `metadata`                    | {% badge content="unknown" /%}                                | Your custom metadata associated with the entity.                                                                              |
| `setParent`                   | {% badge content="function" /%}                               | Sets the parent of the entity by `parentId`. Optionally accepts an `index` to specify the position among siblings.            |
| `unsetParent`                 | {% badge content="function" /%}                               | Unsets an entity's parent and moves it to the root. Optionally accepts an `index` to target a specific child slot.            |
| `setIndex`                    | {% badge content="function" /%}                               | Sets the index of the entity among its siblings.                                                                              |
| `setAttribute`                | {% badge content="function" /%}                               | Updates a single attribute value on the entity by name.                                                                       |
| `delete`                      | {% badge content="function" /%}                               | Deletes the entity from the builder store.                                                                                    |
| `clone`                       | {% badge content="function" /%}                               | Clones the entity, creating a new one with the same attributes and children.                                                  |
| `validateAttribute`           | {% badge content="function" /%}                               | Validates a specific attribute and returns its validated value.                                                               |
| `validateAttributes`          | {% badge content="function" /%}                               | Validates all attributes of the entity.                                                                                       |
| `resetAttributeError`         | {% badge content="function" /%}                               | Clears the validation error for a specific attribute.                                                                         |
| `resetAttributesErrors`       | {% badge content="function" /%}                               | Clears all attribute validation errors for the entity.                                                                        |
| `setAttributesErrors`         | {% badge content="function" /%}                               | Sets multiple attribute validation errors at once for the entity.                                                             |
| `setAttributeError`           | {% badge content="function" /%}                               | Sets a validation error for a specific attribute.                                                                             |
| `getAttributesValues`         | {% badge content="function" /%}                               | Returns the current values of all attributes for the entity.                                                                  |
| `getAttributesErrors`         | {% badge content="function" /%}                               | Returns the current validation errors for the entity's attributes.                                                            |
| `subscribeToAttributesValues` | {% badge content="function" /%}                               | Subscribes to attribute value changes. Returns an unsubscribe function. Optionally accepts a comparator for change detection. |
| `subscribeToAttributesErrors` | {% badge content="function" /%}                               | Subscribes to attribute error changes. Returns an unsubscribe function. Optionally accepts a comparator for change detection. |
