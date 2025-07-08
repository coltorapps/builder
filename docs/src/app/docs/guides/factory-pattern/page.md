---
title: Factory pattern
nextjs:
  metadata:
    title: Factory pattern
    description: Factory pattern guide
---

## About this guide

This short guide will demonstrate how a simple factory pattern can help you in extending your validations with additional logic on both the server and client.

For example, you might encounter a particular field entity type that requires specific database queries during server-side validations, but you may want to exclude or handle them differently on the client side. The flexibility is yours to explore.

## Creating the factory

A factory pattern is a design pattern that provides a way to produce objects based on the provided inputs or conditions.

We will create a factory that creates our form builder, enabling us to extend the validation of the email field entity.

```typescript
import { z } from "zod";

import { createBuilder, createEntity } from "@coltorapps/builder";

export function createFormBuilder(options?: {
  validateEmailField?: (email: string) => Promise<void>;
}) {
  const emailFieldEntity = createEntity({
    async validate(value) {
      const validatedValue = z.string().email().parse(value);

      await options?.validateEmailField(validatedValue);

      return validatedValue;
    },
  });

  const formBuilder = createBuilder({
    entities: { emailField: emailFieldEntity },
  });

  return {
    emailFieldEntity,
    formBuilder,
  };
}
```

## Using the factory on the server

We will create an instance of our form builder on the server using the defined factory, while extending the validation of email fields with a uniqueness check in the database.

```typescript
"use server";

import { validateSchema } from "@coltorapps/builder";

import { db } from "./db";
import { createFormBuilder } from "./form-builder";

const { formBuilder } = createFormBuilder({
  async validateEmailField(email) {
    const userWithEmail = await db.user.findFirst({
      where: {
        email,
      },
    });

    if (userWithEmail) {
      throw new Error("Email already used");
    }
  },
});

export async function saveFormSchema(formSchema: unknown) {
  await validateSchema(formSchema, formBuilder);
}
```

## Using the factory on the client

We will create an instance of our form builder on the client using the defined factory, while extending the validation of email fields with a uniqueness check via a remote API call.

```tsx
"use client";

import {
  BuilderEntities,
  InterpreterEntities,
  useBuilderStore,
  type BuilderEntityComponentProps,
  type InterpreterEntityComponentProps,
} from "@coltorapps/builder-react";

import { createFormBuilder } from "./form-builder";

const { formBuilder, emailFieldEntity } = createFormBuilder({
  async validateEmailField(email) {
    const res = await fetch(
      `/api/check-email?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
      },
    );

    if (!res.ok) {
      throw new Error("Failed to check email");
    }

    const { exists } = await res.json();

    if (exists) {
      throw new Error("Email already used");
    }
  },
});

export function BuilderEmailFieldEntity(
  props: BuilderEntityComponentProps<typeof emailFieldEntity>,
) {
  return <div>Your Builder Field</div>;
}

export function InterpreterEmailFieldEntity(
  props: InterpreterEntityComponentProps<typeof emailFieldEntity>,
) {
  return <div>Your Interpreter Field</div>;
}

// ...

const builderComponents = {
  emailField: BuilderEmailFieldEntity,
};

const interpreterComponents = {
  emailField: InterpreterEmailFieldEntity,
};

function App() {
  const builderStore = useBuilderStore(formBuilder);

  const interpreterStore = useInterpreterStore(formBuilder, someSchema);

  return (
    <div>
      <BuilderEntities
        builderStore={builderStore}
        components={builderComponents}
      />
      <InterpreterEntities
        interpreterStore={interpreterStore}
        components={interpreterComponents}
      />
    </div>
  );
}
```
