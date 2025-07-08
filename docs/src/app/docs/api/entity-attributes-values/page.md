---
title: EntityAttributesValues
nextjs:
  metadata:
    title: EntityAttributesValues
    description: API Reference of EntityAttributesValues.
---

The `EntityAttributesValues` utility type infers the runtime value types of all [attributes](/docs/api/create-attribute) defined in an [entity](/docs/api/create-entity). It produces a record type where each key corresponds to an attribute name, and each value matches the validated type returned by the attribute’s `validate` function.

## Reference

### `EntityAttributesValues<TEntity>` {% class="break-all" %}

```ts
import { type EntityAttributesValues } from "@coltorapps/builder";

import { textFieldEntity } from "./text-field-entity";

type TextFieldAttributesValues = EntityAttributesValues<typeof textFieldEntity>;
```
