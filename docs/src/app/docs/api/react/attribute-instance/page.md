---
title: AttributeInstance
nextjs:
  metadata:
    title: AttributeInstance
    description: API Reference of AttributeInstance.
---

This interface describes the properties of a builder entity's attribute instance, which is usually is part of the `attributes` property of a [builder entity instance](/docs/api/react/builder-entity-instance).

## Reference

### `AttributeInstance<TAttribute>` {% class="break-all" %}

```tsx
import { type AttributeInstance } from "@coltorapps/builder-react";

import { labelAttribute } from "./label-attribute";

type LabelAttributeInstance = AttributeInstance<typeof labelAttribute>;
```

### Properties

The `AttributeInstance` interfaces has the following properties:

| Prop               | Type                            | Description {% class="api-description" %}                                                                               |
| ------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `type`             | {% badge content="string" /%}   | The type identifier of the attribute. Corresponds to the key of the attribute definition in the entity definition.      |
| `getValue`         | {% badge content="function" /%} | Returns the current value of the attribute.                                                                             |
| `setValue`         | {% badge content="function" /%} | Sets the value of the attribute.                                                                                        |
| `getError`         | {% badge content="function" /%} | Returns the current validation error associated with the attribute, if any.                                             |
| `validate`         | {% badge content="function" /%} | Validates the attribute’s value. Returns a promise that resolves with the validation result.                            |
| `setError`         | {% badge content="function" /%} | Sets a validation error for the attribute.                                                                              |
| `subscribeToValue` | {% badge content="function" /%} | Subscribes to changes in the attribute's value. Optionally accepts a comparator. Returns an unsubscribe function.       |
| `subscribeToError` | {% badge content="function" /%} | Subscribes to changes in the attribute's error state. Optionally accepts a comparator. Returns an unsubscribe function. |
