import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createInput } from "../src/input";

describe("input", () => {
  it("can be created", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return z.string().parse(value);
      },
    });

    type InputContext = {
      meta: unknown;
    };

    expectTypeOf(input).toEqualTypeOf<{
      name: "label";
      validate: (value: unknown, context: InputContext) => string;
      defaultValue: (context: InputContext) => string | undefined;
      meta: unknown;
    }>();
  });
});
