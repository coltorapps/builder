import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttribute } from "../src/attribute";
import { createEntity } from "../src/entity";

describe("entity", () => {
  it("can be created with minimal options", () => {
    const entity = createEntity();

    expect(entity).toMatchSnapshot();

    expect(
      entity.defaultValue({
        entity: {
          id: "",
          attributes: {},
          type: "text",
          metadata: undefined,
        },
        entities: {},
        schema: {
          entities: {},
          root: [],
        },
      }),
    ).toMatchSnapshot();
  });

  it("can validate values", () => {
    const entity = createEntity({
      validate(value) {
        return z.string().parse(value);
      },
    });

    expect(
      entity.validate("valid", {
        entity: {
          id: "",
          attributes: {},
          type: "text",
          metadata: undefined,
        },
        entities: {},
        schema: {
          entities: {},
          root: [],
        },
      }),
    ).toMatchSnapshot();

    expect(() =>
      entity.validate(1, {
        entity: {
          id: "",
          attributes: {},
          type: "text",
          metadata: undefined,
        },
        entities: {},
        schema: {
          entities: {},
          root: [],
        },
      }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when validating without a validator", () => {
    const entity = createEntity();

    expect(() =>
      entity.validate("value", {
        entity: {
          id: "",
          attributes: {},
          type: "text",
          metadata: undefined,
        },
        entities: {},
        schema: {
          entities: {},
          root: [],
        },
      }),
    ).toThrowErrorMatchingSnapshot();

    expect(
      entity.validate(undefined, {
        entity: {
          id: "",
          attributes: {},
          type: "text",
          metadata: undefined,
        },
        entities: {},
        schema: {
          entities: {},
          root: [],
        },
      }),
    ).toMatchSnapshot();
  });

  it("can be created with default value", () => {
    const entity = createEntity({
      validate(value) {
        return z.string().parse(value);
      },
      defaultValue() {
        return "test";
      },
    });

    expect(
      entity.defaultValue({
        entity: {
          id: "",
          attributes: {},
          type: "text",
          metadata: undefined,
        },
        entities: {},
        schema: {
          entities: {},
          root: [],
        },
      }),
    ).toMatchSnapshot();
  });

  it("can be created with attributes", () => {
    const entity = createEntity({
      attributes: {
        required: createAttribute({
          validate(value) {
            return value;
          },
        }),
      },
      validate(value) {
        return value;
      },
    });

    expect(entity).toMatchSnapshot();
  });
});
