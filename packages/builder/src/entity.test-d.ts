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

    expectTypeOf(entity).toMatchTypeOf<{
      name: "text";
      validate: (
        value: unknown,
        context: { inputs: Record<string, never> },
      ) => string | Promise<string>;
    }>();
  });

  it("can be created with inputs and default value", () => {
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

    type ValidationContext = {
      inputs: { label: string; defaultValue: string | undefined };
    };

    expectTypeOf(entity).toMatchTypeOf<{
      name: "text";
      validate: (
        value: unknown,
        context: ValidationContext,
      ) => string | Promise<string>;
      inputs: readonly [
        {
          name: "label";
          validate: (value: unknown) => string | Promise<string>;
        },
        {
          name: "defaultValue";
          validate: (
            value: unknown,
          ) => string | undefined | Promise<string | undefined>;
        },
      ];
      defaultValue: (context: ValidationContext) => string | undefined;
    }>();
  });
});
