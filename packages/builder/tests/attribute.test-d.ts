import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttribute, type Attribute } from "../src/attribute";
import { dataResultAsValueResult } from "./utils";

describe("createAttribute", () => {
  it("produces correct types", () => {
    expectTypeOf(
      createAttribute({
        parse: (value) => {
          return {
            success: true,
            value: String(value),
          };
        },
        metadata: "metadata" as const,
      }),
    ).toEqualTypeOf<Attribute<string, never, never, "metadata">>();

    expectTypeOf(
      createAttribute({
        parse: (value) => {
          return dataResultAsValueResult(z.string().safeParse(value));
        },
        metadata: "metadata" as const,
      }),
    ).toEqualTypeOf<Attribute<string, z.ZodError<string>, never, "metadata">>();

    expectTypeOf(
      createAttribute(
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
      Attribute<string, z.ZodError<string>, z.ZodError<string>, "metadata">
    >();
  });
});
