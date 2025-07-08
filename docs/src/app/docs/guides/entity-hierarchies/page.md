---
title: Entity hierarchies
nextjs:
  metadata:
    title: Entity hierarchies
    description: Entity hierarchies guide
---

## About this guide

This short guide demonstrates how to create hierarchies of entities. Specifically, we'll create a section entity that can contain text fields.

## Entity definitions

We'll start by defining entity definitions for text fields and sections.

```tsx
import { createEntity } from "@coltorapps/builder";

import { labelAttribute } from "./label-attribute";

export const textFieldEntity = createEntity({
  attributes: { label: labelAttribute },
  validate(value) {
    if (typeof value !== "string") {
      throw new Error("Must be a string");
    }

    return value;
  },
  parentRequired: true,
});

export const sectionEntity = createEntity({
  attributes: { title: labelAttribute },
  childrenAllowed: true,
});
```

We've added `parentRequired: true` to the text field entity to ensure that it's always a child of a parent entity. The `childrenAllowed: true` flag on the section entity allows it to have child entities.

## Builder definition

Now let's define a form builder. We'll also type-safely constrain sections to only have text fields as children, and text fields to only be placed inside sections. This is entirely optional and is done here solely to demonstrate what's possible.

```tsx
import { createBuilder } from "@coltorapps/builder";

import { sectionEntity, textFieldEntity } from "./entities";

export const formBuilder = createBuilder({
  entities: {
    textField: textFieldEntity,
    section: sectionEntity,
  },
  entitiesExtensions: {
    textField: {
      allowedParents: ["section"],
    },
    section: {
      childrenAllowed: ["textField"],
    },
  },
});
```

## Entity components

Let's create builder and interpreter components for our text field:

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

Now let's create builder and interpreter components for our section entity, which will render its title and children. The builder component will also include a button to add entities during the building phase.

```tsx
import { type ReactNode } from "react";

import {
  type EntityAttributesValues,
  type EntityValue,
} from "@coltorapps/builder";
import {
  useAttributeValue,
  type BuilderEntityComponentProps,
  type InterpreterEntityComponentProps,
} from "@coltorapps/builder-react";

import { type sectionEntity } from "./entities";
import { type formBuilder } from "./form-builder";

function Section(props: { children?: ReactNode; title: string }) {
  return (
    <section>
      <h3>{props.title}</h3>
      <div className="p-4">{props.children}</div>
    </section>
  );
}

export function BuilderSectionEntity(
  props: BuilderEntityComponentProps<typeof sectionEntity, typeof formBuilder>,
) {
  const title = useAttributeValue(props.entity.attributes.title);

  return (
    <Section title={title}>
      <props.RenderChildren />
      <button
        type="button"
        onClick={() =>
          props.builderStore.addEntity({
            type: "textField",
            attributes: {
              label: "",
            },
          })
        }
      >
        Add text field to section
      </button>
    </Section>
  );
}

export function InterpreterSectionEntity(
  props: InterpreterEntityComponentProps<typeof sectionEntity>,
) {
  return (
    <Section title={props.entity.attributes.title}>
      <props.RenderChildren />
    </Section>
  );
}
```

Notice how we've passed the type of our form builder to the builder entity component of the section using `BuilderEntityComponentProps<typeof sectionEntity, typeof formBuilder>`? This constrains the component to be used only with builder stores created from `formBuilder`. It ensures type safety when calling `props.builderStore.addEntity`, giving you full autocomplete for all available entity types and their attributes.

`<props.RenderChildren />` essentially acts as a slot. It simply renders all child entities.

## Builder component

We can now implement our form builder component, which includes a button for adding new sections.

```tsx
import { BuilderEntities, useBuilderStore } from "@coltorapps/builder-react";

import { BuilderSectionEntity, BuilderTextFieldEntity } from "./components";
import { formBuilder } from "./form-builder";

const components = {
  textField: BuilderTextFieldEntity,
  section: BuilderSectionEntity,
};

export default function FormBuilderPage() {
  const builderStore = useBuilderStore(formBuilder);

  return (
    <div>
      <BuilderEntities builderStore={builderStore} components={components} />
      <button
        type="button"
        onClick={() =>
          builderStore.addEntity({
            type: "section",
            attributes: { title: "Cool Section" },
          })
        }
      >
        Add section
      </button>
    </div>
  );
}
```

Each section, during the building phase, will also include an "Add text field to section" button.
