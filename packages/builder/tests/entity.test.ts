import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttribute } from "../src/attribute";
import { createEntity } from "../src/entity";

describe("entity", () => {
  it("can be created with minimal options", () => {
    const entity = createEntity({
      name: "text",
    });

    expect(entity).toMatchSnapshot();

    expect(
      entity.defaultValue({
        entity: { id: "", attributes: {} },
        entitiesValues: {},
      }),
    ).toMatchSnapshot();
  });

  it("can validate values", () => {
    const entity = createEntity({
      name: "text",
      validate(value) {
        return z.string().parse(value);
      },
    });

    expect(
      entity.validate("valid", {
        entity: { id: "", attributes: {} },
        entitiesValues: {},
      }),
    ).toMatchSnapshot();

    expect(() =>
      entity.validate(1, {
        entity: { id: "", attributes: {} },
        entitiesValues: {},
      }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when validating without a validator", () => {
    const entity = createEntity({
      name: "text",
    });

    expect(() =>
      entity.validate("value", {
        entity: { id: "", attributes: {} },
        entitiesValues: {},
      }),
    ).toThrowErrorMatchingSnapshot();

    expect(
      entity.validate(undefined, {
        entity: { id: "", attributes: {} },
        entitiesValues: {},
      }),
    ).toMatchSnapshot();
  });

  it("can be created with default value", () => {
    const entity = createEntity({
      name: "text",
      defaultValue() {
        return "test";
      },
    });

    expect(
      entity.defaultValue({
        entity: { id: "", attributes: {} },
        entitiesValues: {},
      }),
    ).toMatchSnapshot();
  });

  it("can be created with attributes", () => {
    const entity = createEntity({
      name: "text",
      attributes: [
        createAttribute({
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

    expect(entity).toMatchSnapshot();
  });
});
