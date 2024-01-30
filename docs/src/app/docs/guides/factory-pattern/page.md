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
import { createBuilder, createEntity } from "basebuilder";
import { z } from "zod";

export function createFormBuilder(options?: {
  validateEmailField?: (email: string) => Promise<void>;
}) {
  const emailFieldEntity = createEntity({
    name: "emailField",
    async validate(value) {
      const validatedValue = z.string().email().parse(value);

      await options?.validateEmailField(validatedValue);

      return validatedValue;
    },
  });

  const formBuilder = createBuilder({
    entities: [emailFieldEntity],
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

import { validateSchema } from "basebuilder";

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

We will create an instance of our form builder on the client using the defined factory.

As you may have noticed above, the `options` parameter of our factory is optional. We will simply omit it on the client to keep this guide simple.

```typescript
"use client";

import { createEntityComponent, useBuilderStore } from "@basebuilder/react";

import { createFormBuilder } from "./form-builder";

const { formBuilder, emailFieldEntity } = createFormBuilder();

const EmailFieldEntity = createEntityComponent(emailFieldEntity, () => {
  // ...
});

// ...

const builderStore = useBuilderStore(formBuilder);
```

For example, to verify the uniqueness of an email on the client, just utilize the `validateEmailField` option to make a request to a server endpoint and check whether it is unique or not. It's limited only by your imagination.
