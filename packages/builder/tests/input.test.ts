import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createInput } from "../src/input";

describe("input", () => {
  it("can be created", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return value;
      },
    });

    expect(input).toMatchInlineSnapshot(`
      {
        "name": "label",
        "validate": [Function],
      }
    `);
  });

  it("can validate values", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return z.string().parse(value);
      },
    });

    expect(input.validate("valid")).toMatchInlineSnapshot('"valid"');

    expect(() => input.validate(1)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"invalid_type\\",
          \\"expected\\": \\"string\\",
          \\"received\\": \\"number\\",
          \\"path\\": [],
          \\"message\\": \\"Expected string, received number\\"
        }
      ]"
    `);
  });
});
