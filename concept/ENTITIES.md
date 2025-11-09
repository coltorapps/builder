# Form Builder Entities Documentation

## Overview

This document describes the main entities used to build forms in the ReactBuilder system. The architecture follows a headless, framework-agnostic design with separate core logic and React bindings.

## Core Concepts

### Entity System Architecture

The form builder is based on four fundamental concepts:

1. **Attributes** - Atomic, reusable configuration properties (like React props)
2. **Entities** - Form field definitions composed of attributes
3. **Builder** - Registry of entities with validation rules and constraints
4. **Schema** - Concrete form structure built from entities

## 1. Attributes

**Location**: `packages/builder/src/attribute.ts`

Attributes are atomic, reusable configuration properties that can be shared across multiple entity types.

### Attribute Definition

```typescript
Attribute<TName extends string, TValue>
```

### Properties

- **name** (string): Unique attribute identifier
- **validate** (function): Validates and transforms attribute values

### Attribute Context

When validation runs, attributes receive context:

```typescript
{
  schema: Schema,              // Full form schema
  entity: SchemaEntityWithId   // Entity being configured
}
```

### Example Attributes

```typescript
// Label attribute - used by many field types
createAttribute({
  name: "label",
  validate: z.string().min(1).max(100)
});

// Options attribute - used by select fields
createAttribute({
  name: "options",
  validate: z.array(z.object({
    label: z.string(),
    value: z.string()
  }))
});

// Required attribute - indicates mandatory fields
createAttribute({
  name: "required",
  validate: z.boolean()
});
```

### Attribute Extensions

Attributes can be customized per entity or per builder:

**Entity Level:**
```typescript
createEntity({
  name: "textField",
  attributes: [label, required],
  attributesExtensions: {
    label: {
      validate: z.string().min(3) // More strict for this entity
    }
  }
});
```

**Builder Level:**
```typescript
createBuilder({
  entities: [textField],
  entitiesExtensions: {
    textField: {
      attributes: {
        label: {
          validate: z.string().toUpperCase() // Transform for all instances
        }
      }
    }
  }
});
```

## 2. Entities

**Location**: `packages/builder/src/entity.ts`

Entities are form field definitions that describe what can be added to a form.

### Entity Definition

```typescript
Entity<
  TName extends string,
  TAttributes extends ReadonlyArray<Attribute>,
  TValue,
  TParentRequired extends boolean,
  TChildrenAllowed extends boolean
>
```

### Properties

- **name** (string): Unique entity type identifier (appears as "type" in schema)
- **attributes** (ReadonlyArray<Attribute>): Configuration properties for the entity
- **valueAllowed** (boolean): Whether entity can have user input values
- **childrenAllowed** (boolean): Whether entity can contain child entities
- **parentRequired** (boolean): Whether entity must have a parent
- **validate** (function): Validates and transforms entity values
- **defaultValue** (function): Computes initial value for the field
- **shouldBeProcessed** (function): Conditional visibility/validation
- **attributesExtensions** (object): Override attribute validations per entity

### Entity Context

Every entity method receives context:

```typescript
{
  entity: {
    id: string,                              // Unique entity instance ID
    attributes: AttributesValues<TAttributes>, // Configured attribute values
    children?: Array<string>,                 // Child entity IDs
    parentId?: string                         // Parent entity ID
  },
  entitiesValues: Record<string, unknown>    // All entity values in form
}
```

### Entity Types

Entities fall into two categories:

#### Input Entities (valueAllowed: true)

Accept user input and have values.

**Examples:**
- Text fields
- Select fields
- Date pickers
- Checkboxes
- Text areas

#### Display Entities (valueAllowed: false)

Display content but don't accept input.

**Examples:**
- Paragraphs
- Headings
- Dividers
- Images
- Layout containers

### Container Entities (childrenAllowed: true)

Can contain other entities to create hierarchy.

**Examples:**
- Sections
- Fieldsets
- Tabs
- Accordions
- Columns

## 3. Built-in Entity Examples

### Text Field Entity

```typescript
createEntity({
  name: "textField",
  attributes: [label, placeholder, defaultValue, required],
  validate: (value) => z.string().max(255).parse(value),
  defaultValue: (context) => context.entity.attributes.defaultValue
});
```

**Attributes:**
- `label`: Display label for the field
- `placeholder`: Placeholder text
- `defaultValue`: Initial value
- `required`: Whether field is mandatory

**Validation:**
- Must be a string
- Maximum 255 characters

### Select Field Entity

```typescript
createEntity({
  name: "selectField",
  attributes: [label, placeholder, required, options],
  validate: (value, context) => {
    const validOptions = context.entity.attributes.options.map(o => o.value);
    return z.enum(validOptions).parse(value);
  }
});
```

**Attributes:**
- `label`: Display label
- `placeholder`: Placeholder text
- `required`: Whether field is mandatory
- `options`: Array of {label, value} pairs

**Validation:**
- Must be one of the configured option values
- Dynamic validation based on options attribute

### Textarea Field Entity

```typescript
createEntity({
  name: "textareaField",
  attributes: [label, placeholder, defaultValue, required],
  validate: (value) => z.string().max(5000).parse(value),
  defaultValue: (context) => context.entity.attributes.defaultValue
});
```

**Attributes:**
- `label`: Display label
- `placeholder`: Placeholder text
- `defaultValue`: Initial value
- `required`: Whether field is mandatory

**Validation:**
- Must be a string
- Maximum 5000 characters (larger than text field)

### Date Picker Entity

```typescript
createEntity({
  name: "datePickerField",
  attributes: [label, placeholder, defaultDate, required],
  validate: (value) => {
    if (!(value instanceof Date)) {
      throw new Error("Must be a Date object");
    }
    return value;
  },
  defaultValue: (context) => context.entity.attributes.defaultDate
});
```

**Attributes:**
- `label`: Display label
- `placeholder`: Placeholder text
- `defaultDate`: Initial date
- `required`: Whether field is mandatory

**Validation:**
- Must be a Date object

### Paragraph Entity

```typescript
createEntity({
  name: "paragraph",
  attributes: [content],
  // No validate method - no user input
  // No defaultValue - no value to initialize
});
```

**Attributes:**
- `content`: Text content to display

**Characteristics:**
- Display-only entity
- No validation (no user input)
- No value management

## 4. Builder

**Location**: `packages/builder/src/builder.ts`

The Builder is a registry of entities with validation rules and constraints.

### Builder Definition

```typescript
Builder<
  TEntities extends ReadonlyArray<Entity>,
  TEntitiesExtensions extends EntitiesExtensions<TEntities>
>
```

### Properties

- **entities** (ReadonlyArray<Entity>): All supported entity types
- **generateEntityId** (function): Custom ID generation (defaults to UUID)
- **validateEntityId** (function): ID validation logic
- **validateSchema** (function): Custom schema validation
- **entitiesExtensions** (object): Builder-level entity constraints

### Creating a Builder

```typescript
const builder = createBuilder({
  entities: [
    textField,
    selectField,
    textareaField,
    datePickerField,
    paragraph
  ],
  entitiesExtensions: {
    textField: {
      parentRequired: true,
      allowedParents: ["section"]
    }
  }
});
```

### Entities Extensions

Customize entity behavior at the builder level:

#### childrenAllowed

Control which entities can have children:

```typescript
entitiesExtensions: {
  section: {
    childrenAllowed: ["textField", "selectField", "paragraph"]
  }
}
```

- `false` - No children allowed
- `true` - Any entity as children
- `Array<string>` - Specific entity types allowed

#### parentRequired

Override parent requirement:

```typescript
entitiesExtensions: {
  heading: {
    parentRequired: false // Can be at root level
  }
}
```

#### allowedParents

Restrict which entities can be parents:

```typescript
entitiesExtensions: {
  textField: {
    allowedParents: ["section", "fieldset"]
  }
}
```

#### attributes

Extend attribute validations:

```typescript
entitiesExtensions: {
  textField: {
    attributes: {
      label: {
        validate: z.string().min(5).max(50)
      }
    }
  }
}
```

## 5. Schema

**Location**: `packages/builder/src/schema.ts`

A schema is the concrete form structure built from entities.

### Schema Structure

```typescript
Schema<TBuilder extends Builder> = {
  entities: Record<string, SchemaEntity<TBuilder>>,
  root: ReadonlyArray<string>
}
```

### Schema Entity

Each entity in the schema has:

```typescript
{
  type: string,                    // Entity definition name
  attributes: { [key]: value },    // Attribute values
  parentId?: string,               // Parent entity ID
  children?: Array<string>         // Child entity IDs
}
```

### Key Features

- **Flat structure**: Entities stored in object with IDs as keys
- **Root array**: Defines top-level entities and their order
- **Parent-child relationships**: Via `parentId` and `children`
- **Extensive validation**: 20+ error codes for schema correctness

### Example Schema

```typescript
{
  entities: {
    "entity-1": {
      type: "section",
      attributes: { title: "Personal Information" },
      children: ["entity-2", "entity-3"]
    },
    "entity-2": {
      type: "textField",
      attributes: { label: "First Name", required: true },
      parentId: "entity-1"
    },
    "entity-3": {
      type: "textField",
      attributes: { label: "Last Name", required: true },
      parentId: "entity-1"
    }
  },
  root: ["entity-1"]
}
```

## 6. Entity Values

**Location**: `packages/builder/src/entities-values.ts`

Entity values represent user input for entities in a form.

### Entities Values Structure

```typescript
EntitiesValues<TBuilder> = Record<string, EntityValue<TBuilder>>
```

### Entity Value Type

```typescript
EntityValue<TBuilder> =
  | Awaited<ReturnType<TBuilder["entities"][number]["validate"]>>
  | undefined
```

### Key Features

- **Flat structure**: Single-level key-value pairs (like FormData)
- **Only value entities**: Only entities with `valueAllowed: true` have values
- **Conditional processing**: Via `shouldBeProcessed` function
- **Type-safe**: Values match entity validate return type

### Example Entity Values

```typescript
{
  "entity-2": "John",           // textField value
  "entity-3": "Doe",            // textField value
  "entity-4": "option-1",       // selectField value
  "entity-5": new Date("2024-01-01") // datePickerField value
}
```

## 7. Conditional Processing

Entities can be conditionally included in validation and processing.

### shouldBeProcessed Function

```typescript
createEntity({
  name: "dependentField",
  attributes: [label, showWhenId],
  shouldBeProcessed: (context) => {
    const referenceId = context.entity.attributes.showWhenId;
    return context.entitiesValues[referenceId] !== undefined;
  },
  validate: z.string()
});
```

### Behavior

- **Returns false**: Entity is hidden and excluded from validation
- **Returns true**: Entity is visible and validated
- **Access to values**: Can depend on other entity values
- **Dynamic forms**: Create conditional logic and dependencies

### Use Cases

- Show/hide fields based on other selections
- Multi-step forms with conditional steps
- Progressive disclosure patterns
- Dependent field validation

## 8. Validation System

### Three Validation Layers

#### 1. Attribute Validation (Atomic Level)

Validates individual attribute values when configuring entities.

```typescript
createAttribute({
  name: "email",
  validate: z.string().email()
});
```

**When it runs:**
- While building the form schema
- When setting attribute values in the builder UI

#### 2. Entity Validation (Value Level)

Validates user input values for entities.

```typescript
createEntity({
  name: "textField",
  validate: (value, context) => {
    const maxLength = context.entity.attributes.maxLength;
    return z.string().max(maxLength).parse(value);
  }
});
```

**When it runs:**
- When users fill out the form
- During form submission
- On blur/change events (configurable)

**Features:**
- Access to entity context (attributes, children, parent)
- Access to other entity values
- Supports async validation
- Can transform values

#### 3. Schema Validation (Structure Level)

Validates the entire schema structure.

```typescript
createBuilder({
  entities: [textField, section],
  validateSchema: (schema) => {
    // Custom validation logic
    if (schema.root.length === 0) {
      throw new Error("Schema must have at least one root entity");
    }
    return schema;
  }
});
```

**When it runs:**
- Before saving the schema
- On demand via `validateSchema()`

**Built-in validations:**
- Entity IDs are unique
- Entity types exist in builder
- Parent-child relationships are valid
- Attributes match entity definitions
- Circular references are prevented
- Root entities are valid

## 9. Store Systems

### Builder Store

**Location**: `packages/builder/src/builder-store.ts`

**Purpose**: Managing schema construction in the builder UI

#### Events

- `EntityAdded` - New entity added to schema
- `EntityUpdated` - Entity moved or modified
- `EntityAttributeUpdated` - Attribute value changed
- `EntityDeleted` - Entity removed
- `EntityCloned` - Entity duplicated
- `RootUpdated` - Root array changed
- `EntityAttributeErrorUpdated` - Attribute validation error
- `SchemaErrorUpdated` - Schema validation error
- `SchemaUpdated` - Schema changed
- `DataSet` - Full data reset

#### Key Methods

```typescript
// Add entity to schema
builderStore.addEntity({
  definition: "textField",
  parentId?: string,
  index?: number
});

// Delete entity
builderStore.deleteEntity(entityId);

// Update attribute
builderStore.setEntityAttribute(entityId, "label", "First Name");

// Validate attribute
await builderStore.validateEntityAttribute(entityId, "label");

// Validate entire schema
await builderStore.validateSchema();

// Subscribe to events
builderStore.subscribe("EntityAdded", (event) => {
  console.log("Entity added:", event.entityId);
});
```

#### Store Data

```typescript
{
  schema: Schema,
  entitiesAttributesErrors: Record<entityId, Record<attrName, error>>,
  schemaError: unknown
}
```

### Interpreter Store

**Location**: `packages/builder/src/interpreter-store.ts`

**Purpose**: Managing entity values for form filling

#### Events

- `EntityValueUpdated` - Value changed
- `EntityErrorUpdated` - Validation error
- `EntityUnprocessable` - Entity hidden (shouldBeProcessed = false)
- `EntityProcessable` - Entity shown (shouldBeProcessed = true)
- `DataSet` - Full data reset

#### Key Methods

```typescript
// Set entity value
interpreterStore.setEntityValue(entityId, "John");

// Validate single value
await interpreterStore.validateEntityValue(entityId);

// Validate all values
await interpreterStore.validateEntitiesValues();

// Reset to default value
interpreterStore.resetEntityValue(entityId);

// Clear value (set to undefined)
interpreterStore.clearEntityValue(entityId);

// Check if entity should be processed
interpreterStore.isEntityProcessable(entityId);

// Subscribe to events
interpreterStore.subscribe("EntityValueUpdated", (event) => {
  console.log("Value updated:", event.entityId, event.value);
});
```

#### Store Data

```typescript
{
  entitiesValues: Record<entityId, value>,
  entitiesErrors: Record<entityId, error>,
  unprocessableEntitiesIds: Array<string>
}
```

## 10. React Integration

**Location**: `packages/builder-react/src/`

### Entity Components

#### Entity Component Props

```typescript
{
  entity: EntityForRender,      // Entity data with value and error
  children?: JSX.Element[],     // Child entities (if childrenAllowed)
  setValue: (value) => void,    // Update value
  validateValue: () => Promise<void>, // Trigger validation
  resetError: () => void,       // Clear error
  resetValue: () => void,       // Reset to default
  clearValue: () => void        // Clear value (undefined)
}
```

#### Creating Entity Components

```typescript
const TextFieldComponent = createEntityComponent(
  textFieldEntity,
  (props) => (
    <div>
      <label>{props.entity.attributes.label}</label>
      <input
        value={props.entity.value || ""}
        onChange={(e) => props.setValue(e.target.value)}
        onBlur={() => props.validateValue()}
      />
      {props.entity.error && (
        <span className="error">{props.entity.error}</span>
      )}
    </div>
  )
);
```

### Attribute Components

#### Attribute Component Props

```typescript
{
  attribute: AttributeForRender, // Attribute data with value and error
  entity: SchemaEntityWithId,    // Entity being configured
  validateValue: () => Promise<void>, // Trigger validation
  resetError: () => void,        // Clear error
  setValue: (value) => void      // Update value
}
```

#### Creating Attribute Components

```typescript
const LabelAttributeComponent = createAttributeComponent(
  labelAttribute,
  (props) => (
    <div>
      <label>Field Label</label>
      <input
        value={props.attribute.value || ""}
        onChange={(e) => props.setValue(e.target.value)}
        onBlur={() => props.validateValue()}
      />
      {props.attribute.error && (
        <span className="error">{props.attribute.error}</span>
      )}
    </div>
  )
);
```

### Builder UI

```tsx
<BuilderEntities
  builderStore={builderStore}
  components={{
    textField: TextFieldComponent,
    selectField: SelectFieldComponent,
    paragraph: ParagraphComponent
  }}
>
  {(props) => (
    <div className="builder">
      {props.children}
    </div>
  )}
</BuilderEntities>
```

### Interpreter UI

```tsx
<InterpreterEntities
  interpreterStore={interpreterStore}
  components={{
    textField: TextFieldComponent,
    selectField: SelectFieldComponent,
    paragraph: ParagraphComponent
  }}
/>
```

### Attribute Editing UI

```tsx
<BuilderEntityAttributes
  builderStore={builderStore}
  entityId={selectedEntityId}
  components={{
    label: LabelAttributeComponent,
    placeholder: PlaceholderAttributeComponent,
    required: RequiredAttributeComponent
  }}
/>
```

## 11. Entity Lifecycle

### Creation Flow

1. **Define Attributes**
   ```typescript
   const label = createAttribute({ name: "label", validate: z.string() });
   ```

2. **Define Entity**
   ```typescript
   const textField = createEntity({
     name: "textField",
     attributes: [label],
     validate: z.string()
   });
   ```

3. **Create Builder**
   ```typescript
   const builder = createBuilder({ entities: [textField] });
   ```

4. **Create Components**
   ```typescript
   const TextFieldComponent = createEntityComponent(textField, Component);
   ```

### Builder Mode (Schema Construction)

1. User adds entity → `builderStore.addEntity()`
2. Entity appears in builder UI with default attributes
3. User edits attributes → `builderStore.setEntityAttribute()`
4. Attributes validated in real-time
5. Schema validated before save → `validateSchema()`
6. Valid schema stored in database

### Interpreter Mode (Form Filling)

1. Schema loaded → `createInterpreterStore(builder, schema)`
2. Default values populated → `entity.defaultValue()`
3. Form renders with initial values
4. User inputs values → `interpreterStore.setEntityValue()`
5. Values validated in real-time → `validateEntityValue()`
6. Final validation on submit → `validateEntitiesValues()`
7. Valid values submitted to backend

## 12. Advanced Features

### Async Validation

Entity and attribute validation can be asynchronous:

```typescript
createEntity({
  name: "usernameField",
  validate: async (value) => {
    const username = z.string().parse(value);

    // Check if username is available
    const response = await fetch(`/api/check-username?name=${username}`);
    const data = await response.json();

    if (!data.available) {
      throw new Error("Username is already taken");
    }

    return username;
  }
});
```

### Value Transformation

Validation can transform values:

```typescript
createEntity({
  name: "emailField",
  validate: (value) => {
    const email = z.string().email().parse(value);
    return email.toLowerCase().trim(); // Transform to lowercase
  }
});
```

### Cross-Entity Validation

Access other entity values during validation:

```typescript
createEntity({
  name: "passwordConfirmField",
  validate: (value, context) => {
    const passwordId = context.entity.attributes.passwordFieldId;
    const password = context.entitiesValues[passwordId];

    if (value !== password) {
      throw new Error("Passwords must match");
    }

    return value;
  }
});
```

### Dynamic Default Values

Compute default values based on context:

```typescript
createEntity({
  name: "timestampField",
  defaultValue: () => new Date(), // Current time when entity is added
  validate: (value) => value instanceof Date ? value : new Date(value)
});
```

### Custom ID Generation

Control how entity IDs are generated:

```typescript
const builder = createBuilder({
  entities: [textField],
  generateEntityId: () => `field-${Date.now()}-${Math.random()}`
});
```

## 13. Best Practices

### Attribute Design

- Keep attributes atomic and reusable
- Use descriptive names (e.g., `maxLength` not `max`)
- Provide sensible defaults
- Document expected values

### Entity Design

- Single responsibility - one purpose per entity
- Reuse attributes across entities
- Keep validation logic in entities
- Use `shouldBeProcessed` for conditional logic
- Provide helpful error messages

### Schema Design

- Keep schemas flat - avoid deep nesting
- Use meaningful entity IDs
- Document entity relationships
- Test edge cases (empty forms, single field, etc.)

### Validation Strategy

- Validate early and often
- Use Zod for schema validation
- Provide user-friendly error messages
- Handle async validation gracefully
- Don't block UI during validation

### Performance

- Minimize entity re-renders
- Use React.memo for entity components
- Debounce validation on user input
- Lazy load entity components if needed
- Keep store subscriptions focused

## 14. Summary

The ReactBuilder entity system provides:

- **Headless Core**: Framework-agnostic builder package
- **React Bindings**: UI components for React applications
- **Type-Safe**: Full TypeScript inference throughout
- **Atomic Design**: Reusable attributes and entities
- **Flexible**: Extensive customization at multiple levels
- **Validated**: Multi-layer validation system
- **Event-Driven**: Subscribe to changes via stores
- **Zero Dependencies**: Core package has no dependencies
- **Multi-Platform**: Works on web, mobile, and server

This architecture enables building complex form systems with:
- Dynamic conditional logic
- Cross-field validation
- Async validation
- Nested hierarchies
- Custom field types
- Full type safety
