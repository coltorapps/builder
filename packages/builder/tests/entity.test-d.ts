import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createEntity } from "../src/entity";
import { createInput } from "../src/input";

describe("entity", () => {
  it("can be created", () => {
    const entity = createEntity({
      name: "text",
    });

    expectTypeOf(entity).toMatchTypeOf<{
      name: "text";
    }>();
  });

  it("can be created with validator", () => {
    const entity = createEntity({
      name: "text",
      validate(value) {
        return z.string().parse(value);
      },
    });

    type Context = {
      inputs: {
        [x: string]: unknown;
      };
    };

    expectTypeOf(entity).toEqualTypeOf<{
      name: "text";
      validate: (value: unknown, context: Context) => string;
      defaultValue: (context: Context) => string | undefined;
      inputs: ReadonlyArray<{
        name: string;
        validate: (value: unknown) => unknown;
      }>;
    }>();
  });

  it("can be created with inputs", () => {
    const entity = createEntity({
      name: "text",
      validate(value) {
        return z.string().parse(value);
      },
      inputs: [
        createInput({
          name: "label",
          validate(value) {
            return z.string().parse(value);
          },
        }),
        createInput({
          name: "defaultValue",
          validate(value) {
            return z.string().optional().parse(value);
          },
        }),
      ],
      defaultValue({ inputs }) {
        return inputs.defaultValue;
      },
    });

    type Context = {
      inputs: { label: string; defaultValue: string | undefined };
    };

    expectTypeOf(entity).toEqualTypeOf<{
      name: "text";
      validate: (value: unknown, context: Context) => string;
      defaultValue: (context: Context) => string | undefined;
      inputs: readonly [
        {
          name: "label";
          validate: (value: unknown) => string;
        },
        {
          name: "defaultValue";
          validate: (value: unknown) => string | undefined;
        },
      ];
    }>();
  });
});
