---
title: Getting started
---

Learn how to get started with Basebuilder through our guides. {% .lead %}

{% quick-links %}

{% quick-link title="Installation" icon="installation" href="/" description="Step-by-step guides for setting up and using the SDK." /%}

{% quick-link title="Architecture guide" icon="presets" href="/" description="Learn how the internals work to better understand the SDK." /%}

{% quick-link title="Examples" icon="plugins" href="/" description="Explore our examples to spark your inspiration." /%}

{% quick-link title="API reference" icon="theming" href="/" description="Dive into the API Reference for detailed guidance." /%}

{% /quick-links %}

---

## Intro

Basebuilder is a versatile TypeScript SDK designed for crafting custom form builders and much more. You can also develop website builders, dashboard builders, and any other builders you envision.

Some key characteristics:

- Headless: Bring your own components and design the user experience as you need.
- Full-stack: Provides comprehensive tools for building both the interface and validate schemas on the back-end.
- Typesafe: Ensures full type safety by default in every aspect.
- Multi-platform: Runs on web, mobile, servers, serverless environments, and edge computing.
- Framework agnostic: Features a core that is independent of any front-end framework.
- Zero dependencies: Offers a streamlined, lightweight library.
- Unopinionated: Affords you the freedom to build anything you imagine.

Currently, Basebuilder offers support for React, with plans to extend compatibility to other front-end frameworks in the future.

---

## Quick start

Getting started with Basebuilder is straightforward: just install the required dependencies, set up some entities and attributes, and configure a builder.

While our documentation often assumes you're using a full-stack framework such as Next.js for illustrative purposes, you can replicate these setups within a monorepo structure, maintaining decoupled front-end and back-end apps.

To get a simple example of a form builder up and running, follow the steps described below.

### Installing dependencies

Install `basebuilder` and `@basebuilder/react` via your preferred package manager.

```shell
pnpm install basebuilder
pnpm install @basebuilder/react
```

### Your first builder definition

A builder is essentially a set of entities that are available for use during the form building process.

Consider entities as components and attributes as their respective props. Both entities and attributes are atomic, allowing for reusability across various builders and entities, respectively.

For validation purposes, we're going to use [Zod](https://zod.dev/), but you're welcome to use any other validation library or even manually validate inputs as per your requirements.

Let's proceed by creating a "text field" entity with a "label" attribute, and a "form builder".

```typescript
import { createAttribute, createBuilder, createEntity } from "basebuilder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    return z.string().min(1).parse(value);
  },
});

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [labelAttribute],
  validate(value) {
    return z.string().optional().parse(value);
  },
});

export const formBuilder = createBuilder({
  entities: [textFieldEntity],
});
```

We've successfully established a "text field" entity featuring a customizable "label" attribute, ensuring that the "label" is validated as a valid string of at least one character in length. Next, we've put together our "form builder", which lets the end user add multiple instances of "text fields" to his form when building it.

<!--
{% callout title="You should know!" %}
This is what a disclaimer message looks like. You might want to include inline `code` in it. Or maybe you’ll want to include a [link](/) in it. I don’t think we should get too carried away with other scenarios like lists or tables — that would be silly.
{% /callout %} -->

---

## Basic usage

Now it's time to design the user interface of our form builder, which will allow users to add and customize fields in their forms. Additionally, we'll set up back-end validation to ensure the built form contains supported and valid entities before it's saved to the database.

### Front-end

Before building the interface of our form builder, we have to first define how each entity looks like.

```tsx
import { ZodError } from "zod";

import { createEntityComponent } from "@basebuilder/react";

import { textFieldEntity } from "./form-builder.ts";

export const textFieldEntityComponent = createEntityComponent(
  textFieldEntity,
  function (props) {
    return (
      <div>
        <label htmlFor={props.entity.id}>{props.entity.attributes.label}</label>
        <input
          name={props.entity.id}
          value={props.entity.value ?? ""}
          onChange={function (e) {
            props.setValue(e.currentTarget.value);

            void props.validate();
          }}
        />
        {props.entity.error instanceof ZodError ? (
          <span>{props.entity.error.flatten().formErrors[0]}</span>
        ) : null}
      </div>
    );
  },
);
```

Also define how each attribute looks like.

```tsx
import { ZodError } from "zod";

import { createAttributeComponent } from "@basebuilder/react";

import { labelAttribute } from "./form-builder.ts";

export const labelAttributeComponent = createAttributeComponent(
  labelAttribute,
  function (props) {
    return (
      <div>
        <label htmlFor={props.attribute.name}>Field Label</label>
        <input
          name={props.attribute.name}
          value={props.attribute.value ?? ""}
          onChange={function (e) {
            props.setValue(e.currentTarget.value);

            void props.validate();
          }}
        />
        {props.attribute.error instanceof ZodError ? (
          <span>{props.attribute.error.flatten().formErrors[0]}</span>
        ) : null}
      </div>
    );
  },
);
```

Now we can proceed to crafting our form builder interface.

```tsx
"use client";

import { useState } from "react";

import { Builder, useBuilderStore } from "@basebuilder/react";

import { labelAttributeComponent } from "./attributes-components.ts";
import { textFieldEntityComponent } from "./entities-components.ts";
import { formBuilder } from "./form-builder.ts";

export default function Page() {
  const builderStore = useBuilderStore(formBuilder);

  const [activeEntityId, setActiveEntityId] = useState<string>();

  return (
    <div>
      <Builder.Entities
        builderStore={builderStore}
        components={{
          textField: textFieldEntityComponent,
        }}
      >
        {(props) => (
          <button
            type="button"
            onClick={() => {
              setActiveEntityId(props.entity.id);
            }}
          >
            {props.children}
          </button>
        )}
      </Builder.Entities>
      <button
        onClick={() =>
          builderStore.addEntity({
            type: "textField",
            attributes: { label: "" },
          })
        }
      >
        Add a Text Field
      </button>
      {activeEntityId ? (
        <Builder.Attributes
          entityId={activeEntityId}
          builderStore={builderStore}
          components={{
            textField: {
              label: labelAttributeComponent,
            },
          }}
        />
      ) : null}
    </div>
  );
}
```

We can now add multiple text fields to our form. Moreover, when we click on a particular text field, its attributes will appear, allowing us to configure the label for that text field.

### Back-end

Once the user finishes building the form and decides to save it, the "schema" is sent to the back-end for storage in the database. It's important to verify that the schema has a valid structure and includes valid entities and attributes.

```ts
"use server";

import { validateSchema } from "basebuilder";

import { formBuilder } from "./form-builder.ts";

export async function saveForm(schema: unknown) {
  const result = await validateSchema(schema, formBuilder);

  if (result.success) {
    // result.data can be saved to the database
  } else {
    // handle the negative scenario via result.reason
  }
}
```

Now from our front-end, we can transmit the schema to our back-end.

```tsx
"use client";

import { saveForm } from "./save-form";

export default function Page() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    // front-end code from above...
    <button onClick={() => void saveForm(builderStore.getSchema())}>
      Save Form
    </button>
  );
}
```

The following step involves fetching the schema from the database, rendering the form, and handling its submission. You can find detailed examples and tutorials on this process later in the documentation.

---

## Getting help

Consequuntur et aut quisquam et qui consequatur eligendi. Necessitatibus dolorem sit. Excepturi cumque quibusdam soluta ullam rerum voluptatibus. Porro illo sequi consequatur nisi numquam nisi autem. Ut necessitatibus aut. Veniam ipsa voluptatem sed.

### Submit an issue

Inventore et aut minus ut voluptatem nihil commodi doloribus consequatur. Facilis perferendis nihil sit aut aspernatur iure ut dolores et. Aspernatur odit dignissimos. Aut qui est sint sint.

Facere aliquam qui. Dolorem officia ipsam adipisci qui molestiae. Error voluptatem reprehenderit ex.

Consequatur enim quia maiores aperiam et ipsum dicta. Quam ut sit facere sit quae. Eligendi veritatis aut ut veritatis iste ut adipisci illo.

### Join the community

Praesentium facilis iste aliquid quo quia a excepturi. Fuga reprehenderit illo sequi voluptatem voluptatem omnis. Id quia consequatur rerum consectetur eligendi et omnis. Voluptates iusto labore possimus provident praesentium id vel harum quisquam. Voluptatem provident corrupti.

Eum et ut. Qui facilis est ipsa. Non facere quia sequi commodi autem. Dicta autem sit sequi omnis impedit. Eligendi amet dolorum magnam repudiandae in a.

Molestiae iusto ut exercitationem dolorem unde iusto tempora atque nihil. Voluptatem velit facere laboriosam nobis ea. Consequatur rerum velit ipsum ipsam. Et qui saepe consequatur minima laborum tempore voluptatum et. Quia eveniet eaque sequi consequatur nihil eos.
