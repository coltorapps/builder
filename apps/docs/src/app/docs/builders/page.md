---
title: Builders
nextjs:
  metadata:
    title: Builders
    description: Understanding builders.
---

Think of builders as collections of supported entities. For example, you can have a form builder that allows adding text and select fields to a form, and a landing page builder that allows adding hero sections and feature sections to a landing page.

---

## Creating a builder

Let's define a form builder that exclusively supports text fields.

```typescript
import { createBuilder } from "basebuilder";

import { textFieldEntity } from "./text-field-entity";

export const formBuilder = createBuilder({
  entities: [textFieldEntity],
});
```

Later, we will use it both on the client to render our form builder interface, render the built forms, and also to validate users' schemas of built forms on the server before storing them in the database.

## Extending entity relationship constraints

As you may have noticed in [the entities documentation](/docs/entities#relationships-constraints), we have the capability to permit entities to have children through the `childrenAllowed` attribute on the entity. However, there might be cases where we want to specify which specific children are allowed. Defining such constraints is not feasible or type-safe at the entity level because entities are atomic and lack awareness of other potential entities or their combinations within a builder. Nevertheless, implementing this type of constraint is achievable at the builder level.

```typescript
import { createBuilder } from "basebuilder";

import { sectionEntity } from "./section-entity";
import { textFieldEntity } from "./text-field-entity";

export const formBuilder = createBuilder({
  entities: [sectionEntity, textFieldEntity],
  entitiesExtensions: {
    section: {
      childrenAllowed: ["textField"], // Set to `true` to allow any type.
    },
  },
});
```

In the example provided, we enable section entities to have only text fields as their children. Sections cannot contain other sections.

Additionally, we can specify allowed parents for entities using the `allowedParents` attribute in an entity extension.

```typescript
import { createBuilder } from "basebuilder";

import { sectionEntity } from "./section-entity";
import { textFieldEntity } from "./text-field-entity";

export const formBuilder = createBuilder({
  entities: [sectionEntity, textFieldEntity],
  entitiesExtensions: {
    section: {
      childrenAllowed: ["textField"],
    },
    textField: {
      allowedParents: ["section"],
      parentRequired: true,
    },
  },
});
```

Summary of the example above:

- Sections can have only text field children.
- Text fields require a parent.
- Only sections are permitted as parents for text fields.

## Extending attributes validations

In addition to extending attribute validations on the entity level, as explained in [the entities documentation](/docs/entities#extending-attributes-validations), you can also extend them on the builder level. This approach can be valuable in certain situations, such as when an attribute's value depends on the value of another attribute from a different entity.

```typescript
import { createBuilder } from "basebuilder";

import { someEntity } from "./some-entity";

export const formBuilder = createBuilder({
  entities: [someEntity],
  entitiesExtensions: {
    someEntity: {
      attributes: {
        someAttribute: {
          validate(value, context) {
            const validatedValue = context.validate(value);

            // Some custom logic using context.schema or context.entity

            return validatedValue;
          },
        },
      },
    },
  },
});
```

Notice how we're calling `context.validate(value)`, which is essentially the base validation of the attribute, or the extended validation of the attribute at the entity level. Calling it is optional, allowing you to override the validation entirely with custom logic.

{% callout title="You should know!" %}
When extending an attribute's validation at the builder level, the return type of the new validation must match the return type of the attribute's base `validate` method.
{% /callout %}

## Custom entities IDs

By default, when you add entities instances to a schema, UUIDs are created for entity IDs using the `crypto` module. However, this module may not be supported in certain environments. If needed, you can replace the default ID generation and validation processes with your own tailored logic.

```typescript
import { createBuilder } from "basebuilder";
import { v4 as generateUUID, validate as validateUUID } from "uuid";

import { textFieldEntity } from "./text-field-entity";

export const formBuilder = createBuilder({
  entities: [textFieldEntity],
  generateEntityId() {
    return generateUUID();
  },
  validateEntityId(id) {
    if (!validateUUID(id)) {
      throw new Error("Invalid ID");
    }
  },
});
```

## Additional schema validation

After a schema has been successfully validated, you have the option to perform additional custom validations by setting up the `validateSchema` method on your builder. For instance, this allows you to enforce requirements such as ensuring that the schema contains at least one entity.

```typescript
import { createBuilder } from "basebuilder";

import { textFieldEntity } from "./text-field-entity";

export const formBuilder = createBuilder({
  entities: [textFieldEntity],
  validateSchema(schema) {
    if (Object.keys(schema.entities).length === 0) {
      throw new Error("Add at least one entity");
    }

    return schema;
  },
});
```

## Transforming schemas

In the `validateSchema` method of a builder, you have the ability to return a transformed schema. This essentially allows you to convert the original schema into a new one as needed.

```typescript
import { createBuilder } from "basebuilder";

import { textFieldEntity } from "./text-field-entity";

export const formBuilder = createBuilder({
  entities: [textFieldEntity],
  validateSchema(schema) {
    return { entities: {}, root: [] };
  },
});
```

{% callout title="You should know!" %}
Transformations are always applied exclusively when using the `validateSchema` method from the `basebuilder` package. They are intentionally not applied when validating the schema via the builder store, in order to ensure a clear user experience.
{% /callout %}
