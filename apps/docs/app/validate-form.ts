"use server";

import {
  validateEntitiesValues,
  validateSchema,
  type EntitiesValues,
  type Schema,
} from "builder";

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

export const validateSubmission = async (
  values: EntitiesValues<typeof formBuilder>,
  schema: Schema<typeof formBuilder>,
) => validateEntitiesValues(values, formBuilder, schema);
