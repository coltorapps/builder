"use server";

import { validateSchema, type Schema } from "builder";

import { createFormBuilder } from "./builder";

const { formBuilder } = createFormBuilder({
  labelInputValidation(value) {
    if (value === "invalid") {
      throw "THIS IS WRONG! YES!";
    }
  },
});

export const validateForm = async (schema: Schema<typeof formBuilder>) =>
  validateSchema(schema, formBuilder);
