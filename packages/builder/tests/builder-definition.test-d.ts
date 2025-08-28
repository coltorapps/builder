import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  createAttributeDefinition,
  type AttributeDefinition,
} from "../src/attribute-definition";
import {
  createBuilderDefinition,
  type BuilderDefinition,
} from "../src/builder-definition";
import {
  createEntityDefinition,
  type EntityDefinition,
} from "../src/entity-definition";
import { dataResultAsValueResult } from "./utils";

describe("createBuilderDefinition", () => {
  it("produces correct types", () => {
    expectTypeOf(createBuilderDefinition({ entities: {} })).toEqualTypeOf<
      // eslint-disable-next-line @typescript-eslint/ban-types
      BuilderDefinition<{}, never>
    >();

    expectTypeOf(
      createBuilderDefinition({
        entities: {
          textField: createEntityDefinition(
            {
              attributes: {
                label: createAttributeDefinition(
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
      BuilderDefinition<
        {
          readonly textField: EntityDefinition<
            {
              readonly label: AttributeDefinition<
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
