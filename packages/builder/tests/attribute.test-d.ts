import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttribute, type Attribute } from "../src/attribute";
import { dataToValueResult } from "./utils";

describe("createAttribute", () => {
  it("produces correct types", () => {
    expectTypeOf(
      createAttribute({
        validate: (value) => {
          return dataToValueResult(z.string().safeParse(value));
        },
        metadata: "metadata" as const,
      }),
    ).toEqualTypeOf<Attribute<string, never, "metadata">>();

    expectTypeOf(
      createAttribute({
        validate: [
          (value) => dataToValueResult(z.string().safeParse(value)),
          (value) => dataToValueResult(z.string().safeParse(value)),
        ],
        metadata: "metadata" as const,
      }),
    ).toEqualTypeOf<Attribute<string, z.ZodError<string>, "metadata">>();
  });
});
