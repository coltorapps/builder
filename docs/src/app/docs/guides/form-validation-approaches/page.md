---
title: Form validation approaches
nextjs:
  metadata:
    title: Form validation approaches
    description: Form validation approaches guide
---

## About this guide

This short guide demonstrates how to trigger entity validation in various ways to support any desired UX.

## Validate on change

To validate an individual entity whenever its value changes, you can use the `useEntityValueUpdated` hook:

```tsx
import {
  InterpreterEntities,
  useEntityValueUpdated,
  useInterpreterStore,
} from "@coltorapps/builder-react";

const components = { textField: InterpreterTextFieldEntity };

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  useEntityValueUpdated(
    interpreterStore,
    (entity) => void interpreterStore.validateEntityValue(entity.id),
  );

  async function submitForm() {
    const validationResult = await interpreterStore.validateEntitiesValues();

    if (validationResult.success) {
      // Send to server.
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        void submitForm();
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

You can also trigger validation at the interpreter entity component level:

```tsx
import {
  useEntityError,
  useEntityValue,
  type InterpreterEntityComponentProps,
} from "@coltorapps/builder-react";

export function InterpreterTextFieldEntity(
  props: InterpreterEntityComponentProps<typeof textFieldEntity>,
) {
  const value = useEntityValue(props.entity);

  const error = useEntityError(props.entity);

  return (
    <div>
      <input
        value={value}
        onChange={(value) => {
          props.entity.setValue(value);

          void props.entity.validate();
        }}
      />
      {error ? <p className="text-red-500">{String(error)}</p> : null}
    </div>
  );
}
```

## Validate on change after a submission attempt

To validate an entity on value change only after a form submission attempt has occurred, you can use a ref to track submission state:

```tsx
import { useRef } from "react";

import {
  InterpreterEntities,
  useEntityValueUpdated,
  useInterpreterStore,
} from "@coltorapps/builder-react";

const components = { textField: InterpreterTextFieldEntity };

export function App() {
  const interpreterStore = useInterpreterStore(formBuilder, formSchema);

  const submitAttemptedRef = useRef(false);

  useEntityValueUpdated(interpreterStore, (entity) => {
    if (submitAttemptedRef.current) {
      void interpreterStore.validateEntityValue(entity.id);
    }
  });

  async function submitForm() {
    submitAttemptedRef.current = true;

    const validationResult = await interpreterStore.validateEntitiesValues();

    if (validationResult.success) {
      // Send to server.
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        void submitForm();
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

## Validate on blur

The library doesn’t have built-in support for blur events, as they are considered out of scope, so you’ll need to handle them manually at the interpreter entity component level.

```tsx
import {
  useEntityError,
  useEntityValue,
  type InterpreterEntityComponentProps,
} from "@coltorapps/builder-react";

export function InterpreterTextFieldEntity(
  props: InterpreterEntityComponentProps<typeof textFieldEntity>,
) {
  const value = useEntityValue(props.entity);

  const error = useEntityError(props.entity);

  return (
    <div>
      <input
        value={value}
        onChange={(value) => props.entity.setValue(value)}
        onBlur={() => void props.entity.validate()}
      />
      {error ? <p className="text-red-500">{String(error)}</p> : null}
    </div>
  );
}
```

You can trigger validation on any event—such as on blur, on touch, or others—depending on your UX needs.
