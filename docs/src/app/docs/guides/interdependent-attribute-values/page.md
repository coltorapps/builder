---
title: Interdependent Attribute Values
nextjs:
  metadata:
    title: Interdependent attribute values in builder
    description: Guide for handling interdependent attribute validation and editing in @coltorapps/builder
---

## About this guide

This guide explores how to implement **interdependent attributes** — attributes whose valid values depend on the values of other attributes. We'll walk through both **validation logic** and **UI synchronization** for such cases.

The example we'll focus on is a text field entity with `minLength` and `maxLength` attributes. We'll ensure the minimum length is never greater than the maximum length, both in the editor interface and during validation.

## Attribute definitions

We'll start by defining the `minLength` and `maxLength` attributes. Each one is validated as a number using Zod.

```ts
import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const minLengthAttribute = createAttribute({
  validate(value) {
    return z.number().parse(value);
  },
});

export const maxLengthAttribute = createAttribute({
  validate(value) {
    return z.number().parse(value);
  },
});
```

## Entity definition with interdependent attribute validation

Now we'll create a `textFieldEntity` that includes both `minLength` and `maxLength`. The entity-level `validate` function ensures the input string length falls between those values.

We enforce the relationship between minLength and maxLength by extending their validation logic through `attributesExtensions`. This prevents situations like setting a `minLength` of 10 when the `maxLength` is only 5.

```ts
import { createEntity } from "@coltorapps/builder";

import { maxLengthAttribute, minLengthAttribute } from "./attributes";

export const textFieldEntity = createEntity({
  attributes: {
    minLength: minLengthAttribute,
    maxLength: maxLengthAttribute,
  },
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
        // Validate the value as a number
        // using the original attribute validation.
        const min = context.validate(value);

        if (min > context.entity.attributes.maxLength) {
          throw new Error("Must be equal to or less than the max length");
        }

        return min;
      },
    },
    maxLength: {
      validate(value, context) {
        // Validate the value as a number
        // using the original attribute validation.
        const max = context.validate(value);

        if (max < context.entity.attributes.minLength) {
          throw new Error("Must be equal to or greater than the min length");
        }

        return max;
      },
    },
  },
});
```

This ensures that inter-attribute constraints are enforced during schema submission and validation as well as during live validation in the UI.

## Attribute editor components with live interdependency

Next, we define interactive editors for `minLength` and `maxLength`. They read and respond to each other’s current values. This provides instant UI feedback and prevents the user from selecting invalid ranges.

```tsx
import {
  AttributeInstance,
  useAttributeValue,
} from "@coltorapps/builder-react";

import { maxLengthAttribute, minLengthAttribute } from "./attributes";

export function MinLengthAttributeEditor(props: {
  minLengthAttribute: AttributeInstance<typeof minLengthAttribute>;
  maxLengthAttribute: AttributeInstance<typeof maxLengthAttribute>;
}) {
  const minLength = useAttributeValue(props.minLengthAttribute);

  const maxLength = useAttributeValue(props.maxLengthAttribute);

  return (
    <input
      type="number"
      value={minLength ?? ""}
      max={maxLength}
      onChange={(e) =>
        props.minLengthAttribute.setValue(Number(e.target.value))
      }
      placeholder="Min Length"
    />
  );
}

export function MaxLengthAttributeEditor(props: {
  maxLengthAttribute: AttributeInstance<typeof maxLengthAttribute>;
  minLengthAttribute: AttributeInstance<typeof minLengthAttribute>;
}) {
  const maxLength = useAttributeValue(props.maxLengthAttribute);

  const minLength = useAttributeValue(props.minLengthAttribute);

  return (
    <input
      type="number"
      value={maxLength ?? ""}
      min={minLength ?? 0}
      onChange={(e) =>
        props.maxLengthAttribute.setValue(Number(e.target.value))
      }
      placeholder="Max Length"
    />
  );
}
```

## Composing the entity attribute editors

To use the two editors together, we compose them in the `TextFieldAttributesEditor` for the builder UI:

```tsx
import { BuilderEntityComponentProps } from "@coltorapps/builder-react";

import {
  MaxLengthAttributeEditor,
  MinLengthAttributeEditor,
} from "./components";
import { textFieldEntity } from "./entities";

export function TextFieldAttributesEditor(
  props: BuilderEntityComponentProps<typeof textFieldEntity>,
) {
  return (
    <div>
      <MinLengthAttributeEditor
        minLengthAttribute={props.entity.attributes.minLength}
        maxLengthAttribute={props.entity.attributes.maxLength}
      />
      <MaxLengthAttributeEditor
        maxLengthAttribute={props.entity.attributes.maxLength}
        minLengthAttribute={props.entity.attributes.minLength}
      />
    </div>
  );
}
```
