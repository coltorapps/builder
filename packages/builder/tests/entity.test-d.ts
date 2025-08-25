import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttribute, type Attribute } from "../src/attribute";
import { createEntity, type Entity } from "../src/entity";
import { dataResultAsValueResult } from "./utils";

describe("createEntity", () => {
  it("produces correct types", () => {
    expectTypeOf(createEntity()).toEqualTypeOf<
      Entity<never, never, never, never, never>
    >();

    expectTypeOf(createEntity({})).toEqualTypeOf<
      Entity<never, never, never, never, never>
    >();

    expectTypeOf(
      createEntity({
        attributes: {
          label: createAttribute(
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
      Entity<
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
        never,
        "metadata"
      >
    >();

    expectTypeOf(
      createEntity(
        {
          attributes: {
            label: createAttribute(
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
      Entity<
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
      >
    >();
  });
});
