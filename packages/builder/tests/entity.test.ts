import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createEntity } from "../src/entity";
import { createInput } from "../src/input";

describe("entity", () => {
  it("can be created", () => {
    const entity = createEntity({
      name: "text",
    });

    expect(entity).toMatchInlineSnapshot(`
      {
        "defaultValue": [Function],
        "inputs": [],
        "name": "text",
        "validate": [Function],
      }
    `);

    expect(entity.defaultValue({ inputs: {} })).toMatchInlineSnapshot(
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

    expect(entity.validate("valid", { inputs: {} })).toMatchInlineSnapshot(
      '"valid"',
    );

    expect(() => entity.validate(1, { inputs: {} }))
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
      entity.validate("value", { inputs: {} }),
    ).toThrowErrorMatchingInlineSnapshot(
      "\"Values for entities of type 'text' are not allowed.\"",
    );

    expect(entity.validate(undefined, { inputs: {} })).toMatchInlineSnapshot(
      "undefined",
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
            "name": "required",
            "validate": [Function],
          },
        ],
        "name": "text",
        "validate": [Function],
      }
    `);
  });

  it("uses inputs for default value", () => {
    const entity = createEntity({
      name: "text",
      inputs: [
        createInput({
          name: "defaultValue",
          validate(value) {
            return z.string().optional().parse(value);
          },
        }),
      ],
      validate(value) {
        return z.string().parse(value);
      },
      defaultValue({ inputs }) {
        return inputs.defaultValue;
      },
    });

    expect(entity).toMatchInlineSnapshot(`
      {
        "defaultValue": [Function],
        "inputs": [
          {
            "name": "defaultValue",
            "validate": [Function],
          },
        ],
        "name": "text",
        "validate": [Function],
      }
    `);

    expect(
      entity.defaultValue({ inputs: { defaultValue: undefined } }),
    ).toMatchInlineSnapshot("undefined");

    expect(
      entity.defaultValue({ inputs: { defaultValue: "default" } }),
    ).toMatchInlineSnapshot('"default"');
  });

  it("uses inputs for validation", () => {
    const entity = createEntity({
      name: "text",
      inputs: [
        createInput({
          name: "required",
          validate(value) {
            return z.boolean().parse(value);
          },
        }),
      ],
      validate(value, context) {
        const schema = z.string();

        if (!context.inputs.required) {
          return schema.optional().parse(value);
        }

        return schema.parse(value);
      },
    });

    expect(
      entity.validate("valid", { inputs: { required: true } }),
    ).toMatchInlineSnapshot('"valid"');

    expect(
      entity.validate(undefined, { inputs: { required: false } }),
    ).toMatchInlineSnapshot("undefined");

    expect(() => entity.validate(undefined, { inputs: { required: true } }))
      .toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"invalid_type\\",
          \\"expected\\": \\"string\\",
          \\"received\\": \\"undefined\\",
          \\"path\\": [],
          \\"message\\": \\"Required\\"
        }
      ]"
    `);
  });
});
