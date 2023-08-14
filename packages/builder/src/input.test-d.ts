import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createInput } from "./input";

describe("input", () => {
  it("can be created", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return z.string().parse(value);
      },
    });

    expectTypeOf(input).toMatchTypeOf<{
      name: "label";
      validate: (value: unknown) => string | Promise<string>;
    }>();
  });
});
