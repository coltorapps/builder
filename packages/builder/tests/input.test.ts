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
        "meta": {},
        "name": "label",
        "validate": [Function],
      }
    `);
  });

  it("can be created with meta", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return value;
      },
      meta: "test",
    });

    expect(input).toMatchInlineSnapshot(`
      {
        "meta": "test",
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

    expect(input.validate("valid", { meta: {} })).toMatchInlineSnapshot(
      '"valid"',
    );

    expect(() => input.validate(1, { meta: {} }))
      .toThrowErrorMatchingInlineSnapshot(`
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
