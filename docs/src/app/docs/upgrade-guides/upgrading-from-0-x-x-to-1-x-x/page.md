---
title: Upgrading from 0.x.x to 1.x.x
nextjs:
  metadata:
    title: Upgrading to v1
    description: Step-by-step guide for upgrading your project from version 0.x.x to 1.x.x.
---

It’s been one year since the stable release of this library. While no one enjoys breaking changes, extensive feedback and real-world usage made it clear that some core paradigms needed to be rethought from the ground up. This first major release brings significant benefits—everything is now more powerful, scalable, and composable.

The core philosophy of this release is to ensure that all previously supported use cases remain intact—while also enabling use cases that were previously impossible or required workarounds. At first, some things might feel more complex compared to the previous version, but as your product evolves, you'll quickly realize the power and intent behind the new approach. It unlocks capabilities that were simply not feasible before.

This guide focuses solely on breaking changes.

{% callout title="You should know!" %}
The most significant changes occurred in the React package. Importantly, the schema structure remains unchanged—so all your accumulated data will continue to work without any issues.
{% /callout %}

---

## Upgrading dependencies

Install version 1 of `@coltorapps/builder` and `@coltorapps/builder-react` using your preferred package manager:

```shell
pnpm install @coltorapps/builder@^1 @coltorapps/builder-react@^1
```

## Core Breaking Changes

### Runtime compatibility

The library now ships as **ESM-only**, dropping support for CommonJS and legacy module systems.

This change aligns with modern best practices and ensures optimal compatibility with today's build tools, browsers, and server runtimes.

If you're using older tools that expect CommonJS, we recommend upgrading your toolchain to support ESM (e.g., use a modern bundler like Vite, Webpack 5+, or a newer Node.js version).

### Attributes names

You no longer need to define names for attributes within their definitions. Instead, when including attributes in an entity definition, you now provide them as a record object rather than an array. Each key in the record serves as the attribute name for that specific entity.

```ts
const labelAttribute = createAttribute({
  validate(value) {
    return z.string().parse(value);
  },
});

const textFieldEntity = createEntity({
  attributes: { label: labelAttribute },
});
```

Previously, attributes were defined as arrays in entities, which introduced the risk of having duplicate attribute names. With the new record-based approach, this concern is eliminated. Additionally, assigning a name to an attribute is now the responsibility of the entity that uses it, not the attribute definition itself—making attributes fully reusable and context-agnostic.

### Entity names

You no longer need to assign names within entity definitions. Instead, when including entities in a builder definition, you provide them as a record. Each key in the record acts as the entity name for that specific builder.

```ts
const textFieldEntity = createEntity({
  attributes: { label: labelAttribute },
});

const formBuilder = createBuilder({
  entities: { textField: textFieldEntity },
});
```

Previously, entities were defined as arrays in builders, which introduced the risk of having duplicate entity names. With the new record-based approach, this concern is eliminated. Additionally, assigning a name to an entity is now the responsibility of the builder that uses it, not the entity definition itself—making entities fully reusable and context-agnostic.

### Entities context

Entity definition methods such as `validate`, `defaultValue`, and `shouldBeProcessed` receive a context object as part of their arguments. Previously, this context contained `entitiesValues`, a record of raw entity values, which is now removed.

The context now provides a complete record of all entities via `ctx.entities`, not just their values. Each entry includes full entity information (type, attributes, metadata, etc.) alongside the current value of the entity. This change enables more powerful and context-aware logic inside your validation and lifecycle methods.

Each entity entry in the new context has the following properties:

| Property     | Type                                                          | Description {% class="api-description" %}         |
| ------------ | ------------------------------------------------------------- | ------------------------------------------------- |
| `id`         | {% badge content="string" /%}                                 | The unique ID of the entity.                      |
| `type`       | {% badge content="string" /%}                                 | The entity type key, as defined in the builder.   |
| `attributes` | {% badge content="object" /%}                                 | A record of the entity’s attribute values.        |
| `value`      | {% badge content="TValue" /%} {% badge content="optional" /%} | The current runtime value of the entity.          |
| `metadata`   | {% badge content="TMetadata" /%}                              | Metadata defined by you in the entity definition. |
| `parentId`   | {% badge content="string" /%} {% badge content="optional" /%} | The ID of the parent entity, if any.              |
| `children`   | {% badge content="array" /%} {% badge content="optional" /%}  | An array of child entity IDs, if any.             |

This structure allows entity lifecycle methods to reason about the full state of all entities in the schema, not just their values.

### Stores subscriptions

The callback passed to the `subscribe` method in builder and interpreter stores no longer receives specific events. Instead, it receives both the new and previous data snapshots.

The event-driven approach proved to be cumbersome and difficult to scale in complex UIs. By relying on data comparisons instead of events, all data consumers (such as React hooks) gain more flexibility and benefit from a significantly improved developer experience.

## React Breaking Changes

### Store event listeners

Since the builder and interpreter stores no longer emit events, `useBuilderStore` and `useInterpreterStore` no longer accept event listeners. Instead, you should use the `useEntityAdded`, `useEntityDeleted`, `useAttributeValueUpdated`, and `useEntityValueUpdated` hooks.

```tsx
function App() {
  const builderStore = useBuilderStore(formBuilder);

  useEntityAdded(builderStore, (entity) => {
    console.log("Entity added:", entity);
  });

  useEntityDeleted(builderStore, (entity) => {
    console.log("Entity deleted:", entity);
  });

  useAttributeValueUpdated(builderStore, (entity) => {
    console.log(`Attribute "${entity.updatedAttributeName}" updated`, entity);
  });

  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  useEntityValueUpdated(interpreterStore, (entity) => {
    console.log(
      `Entity ${entity.id} value changed`,
      "from",
      entity.prevValue,
      "to",
      entity.value,
    );
  });

  return null;
}
```

These hooks work by observing data updates and comparisons rather than relying on emitted events, enabling a more intuitive flow for building UI systems.

### Consuming store data

The `useBuilderStoreData` and `useInterpreterStoreData` hooks now accept an optional selector, allowing fine-grained control over re-renders and data selection. Previously, the second argument was used to decide whether a render should be triggered based on emitted events. Re-rendering is now handled automatically by comparing the previous and current data slices.

```tsx
function App() {
  const builderStore = useBuilderStore(formBuilder);

  const rootIds = useBuilderStoreData(builderStore, (data) => data.schema.root);

  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  const someEntityValue = useInterpreterStoreData(
    interpreterStore,
    (data) => data.entitiesValues["32e5f795-332e-42d4-8680-d21019c5aa34"],
  );

  return null;
}
```

In rare cases where you’re working with complex data structures that can’t be compared using the built-in shallow comparator, you can provide a custom comparator as the third argument to minimize re-renders.

### Components

The `createEntityComponent` function is deprecated. This abstraction provided no meaningful value and introduced certain limitations.

Previously, a single entity component was used for both builders and interpreters, which violated the single responsibility principle.

Overview:

- The `<BuilderEntities />` and `<BuilderEntity />` components accept entity components whose props satisfy the `BuilderEntityComponentProps<typeof myEntityDefinition>` interface.
- The `<InterpreterEntities />` and `<InterpreterEntity />` components accept entity components whose props satisfy the `InterpreterEntityComponentProps<typeof myEntityDefinition>` interface.
- Entity components no longer reactively receive attribute values, validation errors, values, etc. You can now consume this data using the new React hooks, demonstrated below.

Example of defining a builder and interpreter entity component for a text field entity:

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
        // Attributes values are static in interpreters.
        // We don't need a hook to consume these values.
        {...props.entity.attributes}
      />
      {error ? <p className="text-red-500">{String(error)}</p> : null}
    </div>
  );
}
```

We’ve implemented a `TextField` component—a reusable presentational component that accepts the field’s attributes, current value, and an `onChange` handler. This component is reused by both the builder and interpreter components of the `textFieldEntity`.

The new builder and interpreter components can now be used respectively within builders and interpreters:

```tsx
<BuilderEntities
  builderStore={builderStore}
  components={{ textField: BuilderTextFieldEntity }}
/>

<InterpreterEntities
  interpreterStore={interpreterStore}
  components={{ textField: InterpreterTextFieldEntity }}
/>
```

There are many new hooks available to help you optimize your app and implement any UX you envision:

- `useAttributeValue`: Subscribes to updates of a specific attribute's value and returns the selected data. Used only in builder components.
- `useAttributeError`: Subscribes to the error state of a specific attribute and returns the selected result. Used only in builder components.
- `useEntityAttributesValues`: Subscribes to all attribute value updates of a given entity and returns the result. Used only in builder components.
- `useEntityAttributesErrors`: Subscribes to all attribute error updates of a given entity and returns the result. Used only in builder components.
- `useEntityValue`: Subscribes to the value of a specific interpreter entity instance and returns the result. Used only in interpreter components.
- `useEntityError`: Subscribes to the validation error of a specific interpreter entity instance and returns the result. Used only in interpreter components.

All of these hooks provide fine-grained control over reactivity and re-renders by allowing selectors and comparators to be passed. All of them are type-safe, ensuring they are used in the appropriate context (builder or interpreter).

---

The `createAttributeComponent` function is also deprecated. Like its counterpart, it offered little value and imposed limitations.

The concept of an "attribute component" no longer exists. A builder entity component can now serve as the editor for its own attributes.

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

You can then use the `<BuilderEntity />` component to render the attribute editor for a specific entity:

```tsx
activeEntityId ? (
  <BuilderEntity
    key={activeEntityId}
    entityId={activeEntityId}
    builderStore={builderStore}
    components={{ textField: TextFieldAttributesEditor }}
  />
) : null;
```

This new approach is far more composable and enables new use cases—such as interdependencies between attribute values:

```tsx
export function MinLengthAttributeEditor(props: {
  maxLengthAttribute: AttributeInstance<typeof maxLengthAttribute>;
  minLengthAttribute: AttributeInstance<typeof minLengthAttribute>;
}) {
  const minLength = useAttributeValue(props.minLengthAttribute);

  const maxLength = useAttributeValue(props.maxLengthAttribute);

  return (
    <input
      type="number"
      max={maxLength}
      value={minLength}
      onChange={(e) => props.minLengthAttribute.setValue(e.target.value)}
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
      min={minLength ?? 0}
      value={maxLength}
      onChange={(e) => props.maxLengthAttribute.setValue(e.target.value)}
      placeholder="Max Length"
    />
  );
}

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

---

It’s good to know that both `BuilderEntityComponentProps` and `InterpreterEntityComponentProps` accept a second generic argument to constrain the component to a specific builder:

```tsx
export function BuilderTextFieldEntity(
  props: BuilderEntityComponentProps<
    typeof textFieldEntity,
    typeof formBuilder
  >,
) {
  // `props.builderStore` is inferred from `formBuilder`

  return <input />;
}

export function InterpreterTextFieldEntity(
  props: InterpreterEntityComponentProps<
    typeof textFieldEntity,
    typeof formBuilder
  >,
) {
  // `props.interpreterStore` is inferred from `formBuilder`

  return <input />;
}
```

### Children rendering

Entities that have children—such as a section entity—previously received all rendered children via `props.children`. Now, this prop is an array of child IDs. The `BuilderEntityComponentProps` and `InterpreterEntityComponentProps` interfaces provide two computed components via props: `<props.RenderChildren />` and `<props.RenderChild />`.

`<props.RenderChildren />` essentially acts as a slot, just like `props.children` did in the previous version. It simply renders all child entities:

```tsx
export function BuilderSectionEntity(
  props: BuilderEntityComponentProps<typeof sectionEntity>,
) {
  return (
    <div>
      <h3>My Section</h3>
      <props.RenderChildren />
    </div>
  );
}
```

`<props.RenderChild />` renders a single entity and is especially useful when you need fine-grained control over the rendering of child entities—such as when implementing virtualization for long lists or other advanced use cases:

```tsx
export function BuilderSectionEntity(
  props: BuilderEntityComponentProps<typeof sectionEntity>,
) {
  return (
    <div>
      <h3>My Section</h3>
      {props.children.map((id) => (
        <props.RenderChild key={id} entityId={id} />
      ))}
    </div>
  );
}
```

Both components accept a render prop that wraps each child recursively:

```tsx
<props.RenderChildren>
  {(props) => <div className="border border-blue-500">{props.children}</div>}
</props.RenderChildren>;

props.children.map((id) => (
  <props.RenderChild key={id} entityId={id}>
    {(props) => <div className="border border-blue-500">{props.children}</div>}
  </props.RenderChild>
));
```

If you pass a render prop to `<BuilderEntities />`, `<BuilderEntity />`, `<InterpreterEntities />`, or `<InterpreterEntity />`, as well as to `<props.RenderChildren />` or `<props.RenderChild />`, all wrappers will be applied recursively and stack together.

## Thank you!

A big thank you to everyone using the library ❤️ and sharing feedback. Your input drives these updates and helps us clearly identify what’s missing.

If you notice anything missing from this guide or encounter any issues, don’t hesitate to [open an issue](https://github.com/coltorapps/builder/issues) or reach out on [Discord](https://discord.gg/pEGF5DvVRS).
