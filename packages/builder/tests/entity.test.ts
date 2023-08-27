import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createEntity } from "../src/entity";
import { createInput } from "../src/input";

describe("entity", () => {
  it("can be created with minimal options", () => {
    const entity = createEntity({
      name: "text",
    });

    expect(entity).toMatchInlineSnapshot(`
      {
        "defaultValue": [Function],
        "inputs": [],
        "isValueAllowed": false,
        "name": "text",
        "shouldBeProcessed": [Function],
        "validate": [Function],
      }
    `);

    expect(
      entity.defaultValue({ inputs: {}, values: {} }),
    ).toMatchInlineSnapshot("undefined");
  });

  it("can validate values", () => {
    const entity = createEntity({
      name: "text",
      validate(value) {
        return z.string().parse(value);
      },
    });

    expect(
      entity.validate("valid", { inputs: {}, values: {} }),
    ).toMatchInlineSnapshot('"valid"');

    expect(() => entity.validate(1, { inputs: {}, values: {} }))
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

  it("throws when validating without a validator", () => {
    const entity = createEntity({
      name: "text",
    });

    expect(() =>
      entity.validate("value", { inputs: {}, values: {} }),
    ).toThrowErrorMatchingInlineSnapshot(
      "\"Values for entities of type 'text' are not allowed.\"",
    );

    expect(
      entity.validate(undefined, { inputs: {}, values: {} }),
    ).toMatchInlineSnapshot("undefined");
  });

  it("can be created with default value", () => {
    const entity = createEntity({
      name: "text",
      defaultValue() {
        return "test";
      },
    });

    expect(
      entity.defaultValue({ inputs: {}, values: {} }),
    ).toMatchInlineSnapshot('"test"');
  });

  it("can be created with inputs", () => {
    const entity = createEntity({
      name: "text",
      inputs: [
        createInput({
          name: "required",
          validate(value) {
            return value;
          },
        }),
      ],
      validate(value) {
        return value;
      },
    });

    expect(entity).toMatchInlineSnapshot(`
      {
        "defaultValue": [Function],
        "inputs": [
          {
            "defaultValue": [Function],
            "name": "required",
            "validate": [Function],
          },
        ],
        "isValueAllowed": true,
        "name": "text",
        "shouldBeProcessed": [Function],
        "validate": [Function],
      }
    `);
  });
});
