---
title: Progressive enhancement
nextjs:
  metadata:
    title: Progressive Enhancement in Builder Forms
    description: Learn how to progressively enhance Builder-based forms using Next.js 15 and React Server Components.
---

## About this guide

**Progressive enhancement** is a design philosophy that ensures your web applications work without JavaScript and improve progressively when JavaScript is available. It's especially useful for forms, which should always be usable and accessible, even with scripts disabled.

In this short guide, we’ll implement a simple progressively enhanced form using:

- [**Server functions**](https://react.dev/reference/rsc/server-functions).
- The [`useActionState`](https://react.dev/reference/react/useActionState) hook for hydration-aware error feedback.

We assume you're already familiar with how to define a form builder and interpreter component. We’ll focus on the interpreter phase here.

## Server function

```ts
"use server";

import { validateEntitiesValues } from "@coltorapps/builder";

import { formBuilder } from "./form-builder";

export type SubmitFormState = {
  entitiesValues?: Record<string, unknown>;
  entitiesErrors?: Record<string, unknown>;
};

export async function submitForm(
  _prevState: SubmitFormState,
  formData: FormData,
): Promise<SubmitFormState> {
  const values = Object.fromEntries(formData.entries());

  // Retreive your schema from some data source.
  const schema = await getFormSchema();

  const result = await validateEntitiesValues(values, formBuilder, schema);

  if (!result.success) {
    return {
      entitiesValues: values,
      entitiesErrors: result.entitiesErrors,
    };
  }

  // Success – store the data or redirect.
  return {};
}
```

## Form interpreter

```tsx
"use client";

import { useActionState } from "react";

import {
  InterpreterEntities,
  useInterpreterStore,
} from "@coltorapps/builder-react";

import { formBuilder } from "./form-builder";
import { submitForm, type SubmitFormState } from "./submit-form";

const components = { textField: InterpreterTextFieldEntity };

export default function ProgressiveForm() {
  const [state, formAction, isPending] = useActionState<
    SubmitFormState,
    FormData
  >(submitForm, {
    entitiesValues: {},
    entitiesErrors: {},
  });

  const interpreterStore = useInterpreterStore(formBuilder, formSchema, {
    initialData: {
      entitiesValues: state.entitiesValues,
      entitiesErrors: state.entitiesErrors,
    },
  });

  return (
    <form action={formAction}>
      <InterpreterEntities
        interpreterStore={interpreterStore}
        components={components}
      />
      <button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
```

This form is fully progressively enhanced, meaning it can be submitted even when JavaScript is disabled. The server function handles validation and, if validation fails, returns the submitted values and associated errors. These are passed back into the interpreter as initial state using `useActionState`, allowing the form to render with the user's input and server-side validation messages prefilled after the page reloads.
