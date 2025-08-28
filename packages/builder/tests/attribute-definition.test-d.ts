import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttributeDefinition, type AttributeDefinition } from "../src/attribute-definition";
import { dataResultAsValueResult } from "./utils";

describe("createAttribute", () => {
  it("produces correct types", () => {
    expectTypeOf(
      createAttributeDefinition({
        parse: (value) => {
          return {
            success: true,
            value: String(value),
          };
        },
        metadata: "metadata" as const,
      }),
    ).toEqualTypeOf<AttributeDefinition<string, never, never, "metadata">>();

    expectTypeOf(
      createAttributeDefinition({
        parse: (value) => {
          return dataResultAsValueResult(z.string().safeParse(value));
        },
        metadata: "metadata" as const,
      }),
    ).toEqualTypeOf<AttributeDefinition<string, z.ZodError<string>, never, "metadata">>();

    expectTypeOf(
      createAttributeDefinition(
        {
          parse: (value) =>
            dataResultAsValueResult(z.string().safeParse(value)),
          metadata: "metadata" as const,
          defaultValue: () => "123",
        },
        {
          refine: (value) =>
            dataResultAsValueResult(z.string().safeParse(value)),
        },
      ),
    ).toEqualTypeOf<
      AttributeDefinition<string, z.ZodError<string>, z.ZodError<string>, "metadata">
    >();
  });
});
