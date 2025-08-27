import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttributeDefinition, type AttributeDefinition } from "../src/attribute-definition";
import { createEntityDefinition, type EntityDefinition } from "../src/entity-definition";
import { dataResultAsValueResult } from "./utils";

describe("createEntity", () => {
  it("produces correct types", () => {
    expectTypeOf(createEntityDefinition()).toEqualTypeOf<
      EntityDefinition<never, never, never, never, never>
    >();

    expectTypeOf(createEntityDefinition({})).toEqualTypeOf<
      EntityDefinition<never, never, never, never, never>
    >();

    expectTypeOf(
      createEntityDefinition({
        attributes: {
          label: createAttributeDefinition(
            {
              parse: (value) =>
                dataResultAsValueResult(z.string().safeParse(value)),
              defaultValue: () => "123",
            },
            {
              refine: (value) =>
                dataResultAsValueResult(z.string().safeParse(value)),
            },
          ),
        },
        parse: (value) => dataResultAsValueResult(z.string().safeParse(value)),
        defaultValue: () => "123",
        metadata: "metadata" as const,
      }),
    ).toEqualTypeOf<
      EntityDefinition<
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
        never,
        "metadata"
      >
    >();

    expectTypeOf(
      createEntityDefinition(
        {
          attributes: {
            label: createAttributeDefinition(
              {
                parse: (value) =>
                  dataResultAsValueResult(z.string().safeParse(value)),
                defaultValue: () => "123",
              },
              {
                refine: (value) =>
                  dataResultAsValueResult(z.string().safeParse(value)),
              },
            ),
          },
          parse: (value) =>
            dataResultAsValueResult(z.string().safeParse(value)),
          defaultValue: () => "123",
          metadata: "metadata" as const,
        },
        {
          refine: (value) =>
            dataResultAsValueResult(z.string().safeParse(value)),
        },
      ),
    ).toEqualTypeOf<
      EntityDefinition<
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
      >
    >();
  });
});
