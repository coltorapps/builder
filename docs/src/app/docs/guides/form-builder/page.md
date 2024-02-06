---
title: Form builder
nextjs:
  metadata:
    title: React form builder
    description: React form builder guide
---

## About this guide

This guide will help you grasp the basics of attributes, entities, builders, usage in React and server integrations.

We'll be creating a simple form builder that lets users add text fields to their forms. Users will be able to customize each field by setting details like the label, whether it's required or not, and more.

We will use RSC for illustrative purposes, but you can replicate these setups with any stack.

Note that in this guide, we won't be discussing progressive enhancement of forms to simplify the content and make it easier to understand.

## Prerequisites

To get started with Builder, all you need to do is install the dependencies in your project.

```shell
pnpm install @coltorapps/builder @coltorapps/builder-react
```

## Summary

1. Create a label attribute definition by using the `createAttribute` method.
2. Create a text field entity definition by using the `createEntity` method and attach the label attribute to it.
3. Create a form builder definition by using the `createBuilder` method and attach the text field entity to it.
4. Create an editor component for the label attribute by using the `createAttributeComponent` method.
5. Create a component for the text field entity by using the `createEntityComponent` method.
6. Instantiate a builder store using the `useBuilderStore` hook. Utilize the `Entities` component to render the entities from the store's schema, and use the `Attributes` component to display the attributes of a selected entity.
7. Implement a server action for validating incoming form schemas by using the `validateSchema` method and persisting them in the database. Use this server action to submit the form schema from the client.
8. Retrieve the built form schema and instantiate an interpreter store with the `useInterpreterStore` hook. Utilize the `Interpreter` component to render the entities from the store's schema.
9. Implement a server action for validating incoming form submissions by using the `validateEntitiesValues` method and persisting them in the database. Use this server action to submit the form from the client.

## Label attribute definition

Think of attributes as the props of your entities. For instance, a text field may include attributes such as a label, a requirement flag, a maximum length, and others. Attributes are atomic, enabling their reuse across various entities.

We'll begin with a simple label attribute definition for now, but later we'll add more attributes.

For illustrative purposes, we're going to use [Zod](https://zod.dev/) for validation, but you're free to use any other validation library or even manually validate inputs as per your requirements.

```typescript
import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    return z.string().min(1).parse(value);
  },
});
```

In the example above, we've created a label attribute. Its value must be a valid string of at least one character in length. This validation will be invoked when we later validate the form built by the user.

## Text field entity definition

Think of entities with attributes as components with props. For example, you can define a text field entity, and users can later add multiple instances of text fields to a form.

Now let's create a text field entity definition.

```typescript
import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { labelAttribute } from "./label-attribute";

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [labelAttribute],
  validate(value) {
    return z.string().optional().parse(value);
  },
});
```

In the example above, we've created a text field entity with a label attribute. Its value must be an optional, yet valid, string. This validation will be invoked when we later validate a form submitted by an user.

## Form builder definition

Think of builders as collections of supported entities. For example, you can have a form builder that allows adding text and select fields to a form, but also another landing page builder that allows adding hero sections and feature sections to a landing page. For now, we're going to focus solely on the form builder.

```typescript
import { createBuilder } from "@coltorapps/builder";

import { textFieldEntity } from "./text-field-entity";

export const formBuilder = createBuilder({
  entities: [textFieldEntity],
});
```

Our newly created form builder exclusively supports text fields only. This builder will be used both on the client to render our form builder interface, render the built forms, and also to validate users' schemas of built forms on the server before storing them in the database.

## Label attribute component

Now that we have defined a label attribute, let's create a component for it. This component will be later rendered and used to allow users to configure the labels of text fields.

```tsx
import { ZodError } from "zod";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { labelAttribute } from "./label-attribute";

export const LabelAttribute = createAttributeComponent(
  labelAttribute,
  (props) => {
    const id = `${props.entity.id}-${props.attribute.name}`;

    return (
      <div>
        <label htmlFor={id}>Field Label</label>
        <input
          id={id}
          name={id}
          value={props.attribute.value ?? ""}
          onChange={(e) => props.setValue(e.target.value)}
          required
        />
        {props.attribute.error instanceof ZodError
          ? props.attribute.error.format()._errors[0]
          : null}
      </div>
    );
  },
);
```

The incoming props contain a set of useful methods. For instance, `setValue` is used for setting the value of the attribute. Besides that, the arbitrary entity instance to which the attribute is attached is included in the props as well.

Also, the props include the attribute's validation-thrown error. Remember the `z.string().min(1).parse(value)` part in the attribute's validation? Zod's [parse method](https://zod.dev/?id=parse) throws an error in case of a failed validation. All thrown errors are basically automatically caught and provided to you in the attribute's component. It's up to you how to narrow down the error type and render it.

## Text field entity component

Now that we have defined a text field entity, let's create a component for it. This component will be later rendered when building forms, and also when finally "interpreting" built forms.

```tsx
import { ZodError } from "zod";

import { createEntityComponent } from "@coltorapps/builder-react";

import { textFieldEntity } from "./text-field-entity";

export const TextFieldEntity = createEntityComponent(
  textFieldEntity,
  (props) => {
    return (
      <div>
        <label htmlFor={props.entity.id}>{props.entity.attributes.label}</label>
        <input
          id={props.entity.id}
          name={props.entity.id}
          value={props.entity.value ?? ""}
          onChange={(e) => props.setValue(e.target.value)}
        />
        {props.entity.error instanceof ZodError
          ? props.entity.error.format()._errors[0]
          : null}
      </div>
    );
  },
);
```

Similar to attribute components, entity components receive props that contain a set of useful methods. For instance, `setValue` is used to set the value of the entity. Besides that, the entity instance is included in the props as well, along with all of its attributes (notice how we've rendered the label).

Also, the props include the entity's validation-thrown error. Remember the `z.string().optional().parse(value)` part in the entity's validation? Zod's [parse method](https://zod.dev/?id=parse) throws an error in case of a failed validation. All thrown errors are basically automatically caught and provided to you in the entity's component. It's up to you how to narrow down the error type and render it.

## Form builder rendering

Now that we have our text field and label components in place, we can proceed to render the form builder itself.

```tsx
"use client";

import { Entities, useBuilderStore } from "@coltorapps/builder-react";

import { LabelAttribute, TextFieldEntity } from "./components";
import { formBuilder } from "./form-builder";

/*
| We define a `TextFieldAttributes` component, 
| which is responsible for rendering the attributes 
| of a text field (currently, it only includes the
| label attribute).
*/
function TextFieldAttributes() {
  return (
    <div>
      <LabelAttribute />
    </div>
  );
}

export default function FormBuilderPage() {
  /*
  | We declare an `activeEntityId` state variable, 
  | which holds an optional reference to the currently
  | active entity ID.
  */
  const [activeEntityId, setActiveEntityId] = useState<string>();

  /*
  | We utilize the `useBuilderStore` hook, which creates
  | a builder store for us. This store is responsible for 
  | building a schema based on a builder definition.
  */
  const builderStore = useBuilderStore(formBuilder, {
    events: {
      /*
      | We use the `onEntityAttributeUpdated` event callback
      | to trigger an arbitrary attribute validation every time
      | its value is updated.
      */
      onEntityAttributeUpdated(payload) {
        void builderStore.validateEntityAttribute(
          payload.entity.id,
          payload.attributeName,
        );
      },
      /*
      | We use the `onEntityDeleted` event callback to unset the
      | `activeEntityId` state variable when the currently active
      | entity is deleted.
      */
      onEntityDeleted(payload) {
        if (payload.entity.id === activeEntityId) {
          setActiveEntityId(null);
        }
      },
    },
  });

  async function submitFormSchema() {
    // We will cover server integration in the next section.
  }

  return (
    <div>
      {/*
      | We use the `Entities` component to render the entities
      | tree of the schema within the context of our builder store.
      | We pass the entity components for each defined entity type
      | in our form builder (currently, it's only the text field).
      */}
      <Entities
        builderStore={builderStore}
        components={{ textField: TextFieldEntity }}
      >
        {/*
        | We leverage the render prop of the `Entities` component
        | to wrap each rendered arbitrary entity with additional
        | rendering.
        */}
        {(props) => (
          <div>
            {/* This represents each rendered arbitrary entity. */}
            {props.children}
            {/*
            | A button that marks the arbitrary entity as active,
            | allowing the user to edit its attributes.
            */}
            <button
              type="button"
              onClick={() => {
                setActiveEntityId(props.entity.id);
              }}
            >
              Select
            </button>
            {/*
            | A delete button is rendered next to each entity,
            | that removes the entity from the store's schema.
            */}
            <button
              type="button"
              onClick={() => {
                builderStore.deleteEntity(props.entity.id);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </Entities>
      {/*
      | A button that adds a new text field type entity
      | to the store's schema.
      */}
      <button
        type="button"
        onClick={() =>
          builderStore.addEntity({
            type: "textField",
            attributes: { label: "Text Field" },
          })
        }
      >
        Add Text Field
      </button>
      {/*
      | We render the `EntityAttributes` component only when
      | an entity is active. We also provide the components
      | that render attribute components for each defined
      | entity type in the builder (currently, it's only the
      | text field).
      */}
      {activeEntityId ? (
        <EntityAttributes
          builderStore={builderStore}
          components={{ textField: TextFieldAttributes }}
          entityId={activeEntityId}
        />
      ) : null}
      {/* We will cover server integration in the next section. */}
      <button type="button" onClick={() => void submitFormSchema()}>
        Save Form
      </button>
    </div>
  );
}
```

## Form builder server integration

Let's define a server action that will receive the built form schema.

```typescript
"use server";

import { validateSchema } from "@coltorapps/builder";

import { formBuilder } from "./form-builder";

export async function saveFormSchema(formSchema: unknown) {
  /*
  | We validate the incoming form schema based
  | on the builder that was used to create it.
  */
  const validationResult = await validateSchema(formSchema, formBuilder);

  if (validationResult.success) {
    /*
    | The `validationResult.data` contains a valid schema
    | that can be stored in the database.
    */
  } else {
    /*
    | The `validationResult.reason` holds the reason for
    | validation failure.
    */
  }
}
```

Now, on our client, we can use our newly created server action to submit the form schema.

```typescript
"use client";

import { saveFormSchema } from "./save-form-schema";

// ...

async function submitFormSchema() {
  /*
  | We validate the schema once again on the client
  | to trigger all the validations and provide the user
  | with feedback on what needs to be corrected.
  */
  const validationResult = await builderStore.validateSchema();

  if (validationResult.success) {
    // The schema is valid and can be sent to the server.
    await saveFormSchema(validationResult.data);
  }
}

// ...
```

## Form rendering

Once a form schema has been created, it can be retrieved and "interpreted" on the client. In other words, we display the form to the user for completion.

```tsx
"use server";

import { getForm } from "./get-form";

export default async function FormPage() {
  // Retrieve the form schema from your storage of choice.
  const form = await getForm();

  return <FormInterpreter schema={form.schema} />;
}
```

```tsx
"use client";

import { type Schema } from "@coltorapps/builder";
import { Interpreter, useInterpreterStore } from "@coltorapps/builder-react";

import { TextFieldEntity } from "./components";
import { formBuilder } from "./form-builder";

type FormBuilderSchema = Schema<typeof formBuilder>;

export function FormInterpreter(props: { schema: FormBuilderSchema }) {
  /*
  | We utilize the `useInterpreterStore` hook, which creates
  | an interpreter store for us. This store is used for filling
  | entities values based on a schema and builder definition.
  */
  const interpreterStore = useInterpreterStore(formBuilder, formSchema, {
    events: {
      /*
      | We use the `onEntityValueUpdated` event callback
      | to trigger an arbitrary entity validation every time
      | its value is updated.
      */
      onEntityValueUpdated(payload) {
        void interpreterStore.validateEntityValue(payload.entityId);
      },
    },
  });

  async function submitForm(e: FormEvent<HTMLFormElement>) {
    // We will cover server integration in the next section.
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        void submitForm();
      }}
    >
      {/*
      | We use the `Interpreter` component to render the entities tree
      | of the schema within the context of our interpreter store. We
      | pass the entity components for each defined entity type in our
      | form builder (currently, it's only the text field).
      */}
      <Interpreter
        interpreterStore={interpreterStore}
        components={{ textField: TextFieldEntity }}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Form server integration

Let's define a server action that will receive the submitted schema.

```typescript
"use server";

import { validateSchema } from "@coltorapps/builder";

import { formBuilder } from "./form-builder";
import { getForm } from "./get-form";

export async function saveSubmission(values: FormData) {
  // Retrieve the form schema from your storage of choice.
  const form = await getForm();

  /*
  | We validate the incoming form values based
  | on the desired form schema.
  */
  const validationResult = await validateEntitiesValues(
    Object.entries(values),
    formBuilder,
    form.schema,
  );

  if (validationResult.success) {
    /*
    | The `validationResult.data` contains valid values
    | that can be stored in the database.
    */
  } else {
    /*
    | The `validationResult.entitiesErrors` object contains
    | validation errors corresponding to invalid
    | entities values.
    */
  }
}
```

Now, on our client, we can use our newly created server action to submit the form.

```typescript
"use client";

import { saveSubmission } from "./save-submission";

// ...

async function submitForm(e: FormEvent<HTMLFormElement>) {
  /*
  | We validate the values once again on the client
  | to trigger all the validations and provide the user
  | with feedback on what needs to be corrected.
  */
  const validationResult = await interpreterStore.validateEntitiesValues();

  if (validationResult.success) {
    /*
    | The schema is valid and can be sent to the server.
    | Alternatively you can use `validationResult.data`
    | instead of sending `FormData`.
    */
    await saveSubmission(new FormData(e.target));
  }
}

// ...
```

## Bonus

### Required attribute

Now that we have our form builder system in place, let's expand the functionality of our text field by implementing a "required" attribute.

First, create the attribute definition.

```typescript
import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
```

Attach the attribute definition to the text field entity definition.

```typescript
import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { labelAttribute } from "./label-attribute";
import { requiredAttribute } from "./required-attribute";

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [labelAttribute, requiredAttribute],
  /*
  | We can adjust entity validations based on
  | its attributes values.
  */
  validate(value, context) {
    const schema = z.string();

    if (!context.entity.attributes.required) {
      return schema.optional().parse(value);
    }

    return schema.parse(value);
  },
});
```

Create the editor component of the attribute.

```tsx
import { ZodError } from "zod";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { requiredAttribute } from "./required-attribute";

export const RequiredAttribute = createAttributeComponent(
  requiredAttribute,
  (props) => {
    const id = `${props.entity.id}-${props.attribute.name}`;

    return (
      <div>
        <label htmlFor={id}>
          <input
            id={id}
            name={id}
            type="checkbox"
            checked={props.attribute.value ?? false}
            onChange={(e) => props.setValue(event.target.checked)}
          />
          Required
        </label>
        {props.attribute.error instanceof ZodError
          ? props.attribute.error.format()._errors[0]
          : null}
      </div>
    );
  },
);
```

Include the attribute component in the text field's attributes component.

```tsx
import { LabelAttribute, RequiredAttribute } from "./components";

// ...

function TextFieldAttributes() {
  return (
    <div>
      <LabelAttribute />
      <RequiredAttribute />
    </div>
  );
}

// ...
```
