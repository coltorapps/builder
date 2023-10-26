"use server";

import {
  createBuilder,
  createEntity,
  validateEntitiesValues,
} from "basebuilder";
import { z } from "zod";

const builder = createBuilder({
  entities: [
    createEntity({
      name: "text",
      validate(value) {
        const res = z.string().min(5).safeParse(value);

        if (!res.success) {
          throw res.error.issues[0]?.message;
        }

        return res.data;
      },
    }),
  ],
});

export async function submit(prevState: unknown, formData: FormData) {
  const values = Object.fromEntries(formData);

  const res = await validateEntitiesValues(values, builder, {
    entities: {
      "68b1a0dd-f3f8-4dde-a294-d61680d11223": {
        type: "text",
        attributes: {},
      },
    },
    root: ["68b1a0dd-f3f8-4dde-a294-d61680d11223"],
  });

  if (!res.success) {
    return {
      errors: res.entitiesErrors,
      values,
    };
  }

  return {
    errors: {},
    values: {},
  };
}
