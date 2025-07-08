---
title: React form builder
nextjs:
  metadata:
    title: React form builder
    description: React form builder guide
---

## About this guide

This guide will help you grasp the basics of attributes, entities, builders, usage in React and server integrations.

We'll be creating a simple form builder that lets users add text fields to their forms. Users will be able to customize each field by setting details like the label, whether it's required or not, and more.

Note that in this guide, we won't be discussing progressive enhancement of forms to simplify the content and make it easier to understand.

## Prerequisites

To get started with Builder, all you need to do is install the dependencies in your project.

```shell
pnpm install @coltorapps/builder @coltorapps/builder-react
```

## Core concepts

- **Attributes**: The props of your entities. For instance, a text field may include attributes such as a label, a requirement flag, a maximum length, and others. Attributes are atomic, enabling their reuse across various entities.

- **Entities**: Think of entities with attributes as components with props. For instance, you can define a text field entity and later add multiple instances of text fields with different configurations to a form. Entities are atomic, enabling their reuse across different builders.

- **Builders**: Think of builders as collections of supported entities. For example, you can have a form builder that allows adding text and select fields to a form, and a landing page builder that allows adding hero sections and feature sections to a landing page.

The concept is simple. First, you define the attributes, entities, and builder definitions. Next, you design the UI of your form builder, which subsequently generates a JSON schema for your custom form. This schema can include an arbitrary number of entities and their attribute values. The schema can then be used to render the actual form and allow users to submit it. All of this functionality and more is fully covered by the library.

## Getting started

### Attribute definitions

We'll begin by defining two simple attributes: `label` and `required`. For illustrative purposes, we're using Zod for validation, but you're free to use any other validation library—or even perform manual validation if you prefer.

```ts
import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const labelAttribute = createAttribute({
  validate(value) {
    return z.string().min(1).parse(value);
  },
});

export const requiredAttribute = createAttribute({
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
```

In the example above, we've created a `label` attribute, which must be a non-empty string, and a `required` attribute, which is an optional boolean. These validations will be triggered when we later validate the JSON schema of a custom form built by a user.

### Text field entity definition

Now let's create a text field entity definition.

```ts
import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { labelAttribute, requiredAttribute } from "./attributes";

export const textFieldEntity = createEntity({
  attributes: {
    label: labelAttribute,
    required: requiredAttribute,
  },
  validate(value, context) {
    const schema = z.string();

    if (!context.entity.attributes.required) {
      return schema.optional().parse(value);
    }

    return schema.min(1).parse(value);
  },
});
```

In the example above, we've created a text field entity with a `label` and `required` attribute. You can name each attribute whatever you like by choosing the key under which it appears in the `attributes` object.

The entity's value must be a string. If the `required` attribute is set to `true`, the value must be a non-empty string. If `required` is not set or is `false`, the value may be empty or omitted. This validation logic will be invoked when validating a form submission.

### Form builder definition

It's time to define our form builder.

```ts
import { createBuilder } from "@coltorapps/builder";

import { textFieldEntity } from "./entities";

export const formBuilder = createBuilder({
  entities: { textField: textFieldEntity },
});
```

Our newly created form builder supports only a single entity type named `textField`. You can name your entities however you like by choosing the key under which they appear in the `entities` object. This builder will be used both on the client to render the form builder interface and built forms, and also on the client and server to validate users' form schemas and form submissions.

### Text field entity components for building and interpreting schemas

Now that we've defined our entity and builder, it's time to create UI components that render each entity — both during the builder phase (when users design their form) and the interpreter phase (when users fill out the form).

We start with a `TextField` component, which is a reusable presentational component that accepts the field’s attributes, current value, and an `onChange` handler. This component is used by both the builder and interpreter components.

The `BuilderTextFieldEntity` component is used during the form-building phase. It subscribes to attribute value changes using `useEntityAttributesValues`. Any change to the entity’s attributes will trigger a re-render. This allows the builder interface to reflect live updates as users configure their form fields. Note that you can also subscribe to individual attribute updates using `useAttributeValue(props.entity.attributes.label)`.

The `InterpreterTextFieldEntity` component is used during the form interpretation (or submission) phase. It subscribes to the entity's value and error using `useEntityValue` and `useEntityError`. Unlike in the builder phase, the entity’s attributes are static here, so they’re accessed directly without hooks.

```tsx
import {
  type EntityAttributesValues,
  type EntityValue,
} from "@coltorapps/builder";
import {
  useEntityAttributesValues,
  useEntityError,
  useEntityValue,
  type BuilderEntityComponentProps,
  type InterpreterEntityComponentProps,
} from "@coltorapps/builder-react";

import { type textFieldEntity } from "./entities";

interface TextFieldProps
  extends EntityAttributesValues<typeof textFieldEntity> {
  id: string;
  value?: EntityValue<typeof textFieldEntity>;
  onChange?: (value: EntityValue<typeof textFieldEntity>) => void;
}

function TextField(props: TextFieldProps) {
  return (
    <div>
      <label htmlFor={props.id} aria-required={props.required}>
        {props.label.trim() ? props.label : "Label"}
      </label>
      <input
        id={props.id}
        name={props.id}
        value={props.value ?? ""}
        onChange={(e) => props.onChange?.(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
      />
    </div>
  );
}

export function BuilderTextFieldEntity(
  props: BuilderEntityComponentProps<typeof textFieldEntity>,
) {
  const attributes = useEntityAttributesValues(props.entity);

  return <TextField id={props.entity.id} {...attributes} />;
}

export function InterpreterTextFieldEntity(
  props: InterpreterEntityComponentProps<typeof textFieldEntity>,
) {
  const value = useEntityValue(props.entity);

  const error = useEntityError(props.entity);

  return (
    <div>
      <TextField
        id={props.entity.id}
        value={value}
        onChange={(value) => props.entity.setValue(value)}
        {...props.entity.attributes}
      />
      {error ? <p className="text-red-500">{String(error)}</p> : null}
    </div>
  );
}
```

Note that the validation error returned by `useEntityError` is of type `unknown`. This is intentional to give you full control over how you interpret and present errors. You can use `instanceof`, `typeof`, or other type checks depending on how your validation logic is structured. In the example, we simply cast the error to a string for display, but you can customize the rendering to suit your error structure.

### Attributes editors component

In this section, we define reusable editor components for editing individual attributes — specifically the `label` and `required` attributes. These components use the `useAttributeValue` and `useAttributeError` hooks to subscribe to the current value and validation error of each attribute in real time. This ensures that any changes or validation results are immediately reflected in the UI.

The `LabelAttributeEditor` renders a text input for editing the `label` attribute, while the `RequiredAttributeEditor` renders a checkbox for toggling the `required` attribute. Both components are reactive and display any associated validation error directly below the input field.

These editor components are generic and can be reused across different entities that include the same attributes. However, in our case, we only need them for the text field entity, which is handled by the `TextFieldAttributesEditor` component. This component composes both editors, wiring them to the respective attributes of the provided text field entity.

By keeping attribute editors modular and focused, you gain flexibility and reusability across a wide range of entity configurations.

```tsx
import {
  useAttributeError,
  useAttributeValue,
  type AttributeInstance,
  type BuilderEntityComponentProps,
} from "@coltorapps/builder-react";

import { type labelAttribute, type requiredAttribute } from "./attributes";
import { type textFieldEntity } from "./entities";

export function LabelAttributeEditor(props: {
  attribute: AttributeInstance<typeof labelAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  const error = useAttributeError(props.attribute);

  return (
    <div>
      <label htmlFor={props.attribute.type} aria-required>
        Label
      </label>
      <input
        id={props.attribute.type}
        name={props.attribute.type}
        value={value ?? ""}
        onChange={(e) => props.attribute.setValue(e.target.value)}
        required
      />
      {error ? <p className="text-red-500">{String(error)}</p> : null}
    </div>
  );
}

export function RequiredAttributeEditor(props: {
  attribute: AttributeInstance<typeof requiredAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  const error = useAttributeError(props.attribute);

  return (
    <div>
      <label htmlFor={props.attribute.type} aria-required>
        Required
      </label>
      <input
        id={props.attribute.type}
        name={props.attribute.type}
        type="checkbox"
        checked={value}
        onChange={(e) => props.attribute.setValue(e.target.checked)}
      />
      {error ? <p className="text-red-500">{String(error)}</p> : null}
    </div>
  );
}

export function TextFieldAttributesEditor(
  props: BuilderEntityComponentProps<typeof textFieldEntity>,
) {
  return (
    <div>
      <LabelAttribute attribute={props.entity.attributes.label} />
      <RequiredAttribute attribute={props.entity.attributes.required} />
    </div>
  );
}
```

### Form builder component

Our custom form builder component brings everything together. It initializes a builder store using the form builder definition and provides an UI for building a form dynamically.

We define an `activeEntityId` state that holds the ID of the currently selected entity so the user can edit its attributes. The `useBuilderStore` hook initializes the builder store, which is responsible for managing and validating the form schema.

To ensure reactive validation, we subscribe to entity attribute updates using `useAttributeValueUpdated`, which triggers validation for the updated attribute. We also use `useEntityDeleted` to clear the active selection if the selected entity is deleted.

The `BuilderEntities` component renders the current list of entities from the store’s schema. Each entity is enhanced with "Select" and "Delete" buttons. The "Add Text Field" button appends a new entity to the form.

Finally, when an entity is selected, we render `BuilderEntity` to show the attribute editors, and a "Save Form" button triggers schema validation, returning the form data if everything is valid.

```tsx
import { useState } from "react";

import {
  BuilderEntities,
  BuilderEntity,
  useAttributeValueUpdated,
  useBuilderStore,
  useEntityDeleted,
} from "@coltorapps/builder-react";

import {
  BuilderTextFieldEntity,
  TextFieldAttributesEditor,
} from "./components";
import { formBuilder } from "./form-builder";

const entityComponents = { textField: BuilderTextFieldEntity };

const attributeEditorsComponents = { textField: TextFieldAttributesEditor };

export default function FormBuilderPage() {
  const [activeEntityId, setActiveEntityId] = useState<string>();

  const builderStore = useBuilderStore(formBuilder);

  useAttributeValueUpdated(
    builderStore,
    (entity) =>
      void builderStore.validateEntityAttribute(
        entity.id,
        entity.updatedAttributeName,
      ),
  );

  useEntityDeleted(builderStore, (entity) => {
    if (entity.id === activeEntityId) {
      setActiveEntityId(null);
    }
  });

  async function submitFormSchema() {
    const validationResult = await builderStore.validateSchema();

    if (validationResult.success) {
      // The schema is valid and can be sent to the server.
      // validationResult.data;
    }
  }

  return (
    <div>
      <BuilderEntities
        builderStore={builderStore}
        components={entityComponents}
      >
        {(props) => (
          <div>
            {props.children}
            <button
              type="button"
              onClick={() => {
                setActiveEntityId(props.entity.id);
              }}
            >
              Select
            </button>
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
      </BuilderEntities>
      <button
        type="button"
        onClick={() =>
          builderStore.addEntity({
            type: "textField",
            attributes: { label: "Text Field", required: false },
          })
        }
      >
        Add Text Field
      </button>
      {activeEntityId ? (
        <BuilderEntity
          key={activeEntityId}
          entityId={activeEntityId}
          builderStore={builderStore}
          components={attributeEditorsComponents}
        />
      ) : null}
      <button type="button" onClick={() => void submitFormSchema()}>
        Save Form
      </button>
    </div>
  );
}
```

### Server-side form schema validation

Once a form is created on the client, its schema can be submitted to the server for validation and persistence. The `validateSchema` function allows you to verify that the submitted schema is structurally and semantically correct according to the builder definition used to generate it.

Below is an example of how you can validate an incoming schema on the server. If the schema passes validation, it can safely be stored in your database. Otherwise, you can handle the validation errors accordingly.

```ts
import { validateSchema } from "@coltorapps/builder";

import { formBuilder } from "./form-builder";

export async function saveFormSchema(formSchema: unknown) {
  const validationResult = await validateSchema(formSchema, formBuilder);

  if (validationResult.success) {
    // The form schema is valid and can be stored in your database.
    const validSchema = validationResult.data;
  } else {
    // The schema is invalid — handle the error appropriately.
    const reason = validationResult.reason;
  }
}
```

This pattern ensures consistent validation logic across both client and server.

Here’s a refined paragraph to introduce the **Form Rendering** section, including the note about fetching the schema:

### Interpreting a form schema

Once a form schema has been stored on the server, it can be retrieved and rendered on the client for user input. Typically, the schema would be fetched from your database or another data source and passed into the interpreter. The `useInterpreterStore` hook creates an interpreter store based on the builder definition and the fetched schema, allowing you to render the form, manage value changes, and validate input.

Below is an example of how to render a form using the stored schema and handle form submission:

```tsx
import {
  InterpreterEntities,
  useEntityValueUpdated,
  useInterpreterStore,
} from "@coltorapps/builder-react";

import { InterpreterTextFieldEntity } from "./components";
import { formBuilder } from "./form-builder";

const components = { textField: InterpreterTextFieldEntity };

export function FormInterpreter() {
  // Assume `formSchema` is fetched from your data source
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  useEntityValueUpdated(interpreterStore, (entity) => {
    void interpreterStore.validateEntityValue(entity.id);
  });

  async function submitForm(e: FormEvent<HTMLFormElement>) {
    const validationResult = await interpreterStore.validateEntitiesValues();

    if (validationResult.success) {
      // Valid input — send `validationResult.data` to your server
      validationResult.data;
      // Alternatively, gather the raw values with FormData
      new FormData(e.target);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submitForm(e);
      }}
    >
      <InterpreterEntities
        interpreterStore={interpreterStore}
        components={components}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Server-side form values validation

When a form is submitted by a user, the server must validate the submitted values against the stored schema to ensure correctness and integrity.

```ts
import { validateEntitiesValues } from "@coltorapps/builder";

import { formBuilder } from "./form-builder";

export async function saveSubmission(values: FormData) {
  // Retrieve the JSON form schema from your storage of choice.
  const formSchema = await getFormSchema();

  /*
  | Validate the submitted form values against the retrieved schema.
  | We assume `values` is a FormData object, which we convert to entries.
  */
  const validationResult = await validateEntitiesValues(
    Object.entries(values),
    formBuilder,
    formSchema,
  );

  if (validationResult.success) {
    /*
    | The `validationResult.data` contains the validated entity values,
    | ready to be processed or stored in your database.
    */
  } else {
    /*
    | The `validationResult.entitiesErrors` object contains detailed
    | validation errors for each invalid entity in the submission.
    */
  }
}
```
