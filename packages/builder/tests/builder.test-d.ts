import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttribute, type Attribute } from "../src/attribute";
import { createBuilder, type Builder } from "../src/builder";
import { createEntity, type Entity } from "../src/entity";
import { dataResultAsValueResult } from "./utils";

describe("createBuilder", () => {
  it("produces correct types", () => {
    expectTypeOf(createBuilder({ entities: {} })).toEqualTypeOf<
      // eslint-disable-next-line @typescript-eslint/ban-types
      Builder<{}, never>
    >();

    expectTypeOf(
      createBuilder({
        entities: {
          textField: createEntity(
            {
              attributes: {
                label: createAttribute(
                  {
                    parse: (value) =>
                      dataResultAsValueResult(z.string().safeParse(value)),
                  },
                  {
                    refine: (value) =>
                      dataResultAsValueResult(z.string().safeParse(value)),
                  },
                ),
              },
              parse: (value) =>
                dataResultAsValueResult(z.string().safeParse(value)),
              metadata: "metadata" as const,
            },
            {
              refine: (value) =>
                dataResultAsValueResult(z.string().safeParse(value)),
            },
          ),
        },
        refineSchema() {
          return {
            success: false,
            error: "refine failed" as const,
          };
        },
      }),
    ).toEqualTypeOf<
      Builder<
        {
          readonly textField: Entity<
            {
              readonly label: Attribute<
                string,
                z.ZodError<string>,
                z.ZodError<string>,
                never
              >;
            },
            string,
            z.ZodError<string>,
            z.ZodError<string>,
            "metadata"
          >;
        },
        "refine failed"
      >
    >();
  });
});
