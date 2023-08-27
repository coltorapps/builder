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

    expectTypeOf(input).toEqualTypeOf<{
      name: "label";
      validate: (value: unknown) => string;
      defaultValue: () => string | undefined;
    }>();
  });
});
