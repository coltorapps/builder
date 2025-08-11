import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttribute, type Attribute } from "../src/attribute";
import { createEntity, type Entity } from "../src/entity";
import { dataToValueResult } from "./utils";

describe("createEntity", () => {
  it("produces correct types", () => {
    expectTypeOf(createEntity()).toEqualTypeOf<
      Entity<never, never, never, never>
    >();

    expectTypeOf(createEntity({})).toEqualTypeOf<
      Entity<never, never, never, never>
    >();

    expectTypeOf(
      createEntity({
        attributes: {
          label: createAttribute({
            validate: [
              (value) => dataToValueResult(z.string().safeParse(value)),
              (value) => dataToValueResult(z.string().safeParse(value)),
            ],
          }),
        },
        validate: [
          (value) => dataToValueResult(z.string().safeParse(value)),
          (value) => dataToValueResult(z.string().safeParse(value)),
        ],
        metadata: "metadata" as const,
      }),
    ).toEqualTypeOf<
      Entity<
        {
          readonly label: Attribute<string, z.ZodError<string>, never>;
        },
        string,
        z.ZodError<string>,
        "metadata"
      >
    >();
  });
});
