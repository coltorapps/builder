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
        "meta": {},
        "name": "text",
        "validate": [Function],
      }
    `);

    expect(entity.defaultValue({ inputs: {}, meta: {} })).toMatchInlineSnapshot(
      "undefined",
    );
  });

  it("can validate values", () => {
    const entity = createEntity({
      name: "text",
      validate(value) {
        return z.string().parse(value);
      },
    });

    expect(
      entity.validate("valid", { inputs: {}, meta: {} }),
    ).toMatchInlineSnapshot('"valid"');

    expect(() => entity.validate(1, { inputs: {}, meta: {} }))
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
      entity.validate("value", { inputs: {}, meta: {} }),
    ).toThrowErrorMatchingInlineSnapshot(
      "\"Values for entities of type 'text' are not allowed.\"",
    );

    expect(
      entity.validate(undefined, { inputs: {}, meta: {} }),
    ).toMatchInlineSnapshot("undefined");
  });

  it("can be created with meta", () => {
    const entity = createEntity({
      name: "text",
      meta: "test",
    });

    expect(entity).toMatchInlineSnapshot(`
      {
        "defaultValue": [Function],
        "inputs": [],
        "meta": "test",
        "name": "text",
        "validate": [Function],
      }
    `);
  });

  it("can be created with default value", () => {
    const entity = createEntity({
      name: "text",
      defaultValue() {
        return "test";
      },
    });

    expect(entity.defaultValue({ inputs: {}, meta: {} })).toMatchInlineSnapshot(
      '"test"',
    );
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
            "meta": {},
            "name": "required",
            "validate": [Function],
          },
        ],
        "meta": {},
        "name": "text",
        "validate": [Function],
      }
    `);
  });
});
