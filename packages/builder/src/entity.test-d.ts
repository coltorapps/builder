import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createEntity } from "./entity";
import { createInput } from "./input";

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

    type Context = { inputs: Record<string, never> };

    expectTypeOf(entity).toMatchTypeOf<{
      name: "text";
      validate: (value: unknown, context: Context) => string;
      inputs: ReadonlyArray<{
        name: string;
        validate: (value: unknown) => unknown;
      }>;
      defaultValue: (context: Context) => string | undefined;
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

    expectTypeOf(entity).toMatchTypeOf<{
      name: "text";
      validate: (value: unknown, context: Context) => string;
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
      defaultValue: (context: Context) => string | undefined;
    }>();
  });
});
