"use server";

import { validateSchema, type SerializedSchemaStoreData } from "builder";

import { builder } from "./builder";

export const testServer = async (
  schema: SerializedSchemaStoreData<typeof builder>,
) => {
  const result = await validateSchema(schema, { builder });

  return result;
};
