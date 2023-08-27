import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createInput } from "../src/input";

describe("input", () => {
  it("can be created with minimal options", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return value;
      },
    });

    expect(input).toMatchInlineSnapshot(`
      {
        "defaultValue": [Function],
        "name": "label",
        "validate": [Function],
      }
    `);

    expect(input.defaultValue()).toMatchInlineSnapshot("undefined");

    expect(input.validate("test")).toMatchInlineSnapshot('"test"');
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

  it("can be created with default value", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return z.string().parse(value);
      },
      defaultValue() {
        return "test";
      },
    });

    expect(input.defaultValue()).toMatchInlineSnapshot('"test"');
  });
});
