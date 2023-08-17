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
        "meta": {},
        "name": "label",
        "validate": [Function],
      }
    `);

    expect(input.defaultValue({ meta: {} })).toMatchInlineSnapshot('undefined');
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
        "defaultValue": [Function],
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

    expect(input.defaultValue({ meta: {} })).toMatchInlineSnapshot('"test"');
  });
});
