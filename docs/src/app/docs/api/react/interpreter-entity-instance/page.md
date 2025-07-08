---
title: InterpreterEntityInstance
nextjs:
  metadata:
    title: InterpreterEntityInstance
    description: API Reference of InterpreterEntityInstance.
---

This interface describes the properties of an interpreter entity instance, which is usually injected as a prop into [interpreter entities components](/docs/api/react/interpreter-entity-component-props).

## Reference

### `InterpreterEntityInstance<TEntity>` {% class="break-all" %}

```tsx
import { type InterpreterEntityInstance } from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

type InterpreterTextFieldInstance = InterpreterEntityInstance<
  typeof textFieldEntity
>;
```

### Properties

The `InterpreterEntityInstance` interfaces has the following properties:

| Prop               | Type                                                          | Description {% class="api-description" %}                                                                    |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`               | {% badge content="string" /%}                                 | The unique identifier of the entity.                                                                         |
| `type`             | {% badge content="string" /%}                                 | The type identifier of the entity. Corresponds to the key of the entity definition in the builder defintion. |
| `children`         | {% badge content="array" /%} {% badge content="optional" /%}  | Optional array of child entity IDs.                                                                          |
| `parentId`         | {% badge content="string" /%} {% badge content="optional" /%} | Optional ID of the parent entity. If undefined, the entity is considered a root-level entity.                |
| `attributes`       | {% badge content="object" /%}                                 | A record of all attributes values for the entity, keyed by attribute name.                                   |
| `metadata`         | {% badge content="unknown" /%}                                | Your custom metadata associated with the entity.                                                             |
| `getValue`         | {% badge content="function" /%}                               | Returns the current value of the entity, or `undefined` if no value is set.                                  |
| `setValue`         | {% badge content="function" /%}                               | Sets the entity’s value.                                                                                     |
| `getError`         | {% badge content="function" /%}                               | Returns the current validation error associated with the entity’s value, if any.                             |
| `setError`         | {% badge content="function" /%}                               | Sets a validation error for the entity’s value.                                                              |
| `resetValue`       | {% badge content="function" /%}                               | Resets the value of the entity to its initial state.                                                         |
| `clearValue`       | {% badge content="function" /%}                               | Clears the value of the entity completely.                                                                   |
| `resetError`       | {% badge content="function" /%}                               | Clears the current validation error.                                                                         |
| `validate`         | {% badge content="function" /%}                               | Validates the current value of the entity. Returns a promise that resolves with the validation result.       |
| `subscribeToValue` | {% badge content="function" /%}                               | Subscribes to changes in the entity’s value. Returns an unsubscribe function.                                |
| `subscribeToError` | {% badge content="function" /%}                               | Subscribes to changes in the entity’s error state. Returns an unsubscribe function.                          |
