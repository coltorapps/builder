import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createEntity } from "../src/entity";
import { createInput } from "../src/input";

describe("entity", () => {
  it("can be created with minimal options", () => {
    const entity = createEntity({
      name: "text",
    });

    expect(entity).toMatchSnapshot();

    expect(entity.defaultValue({ inputs: {}, values: {} })).toMatchSnapshot();
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
    ).toMatchSnapshot();

    expect(() =>
      entity.validate(1, { inputs: {}, values: {} }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when validating without a validator", () => {
    const entity = createEntity({
      name: "text",
    });

    expect(() =>
      entity.validate("value", { inputs: {}, values: {} }),
    ).toThrowErrorMatchingSnapshot();

    expect(
      entity.validate(undefined, { inputs: {}, values: {} }),
    ).toMatchSnapshot();
  });

  it("can be created with default value", () => {
    const entity = createEntity({
      name: "text",
      defaultValue() {
        return "test";
      },
    });

    expect(entity.defaultValue({ inputs: {}, values: {} })).toMatchSnapshot();
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

    expect(entity).toMatchSnapshot();
  });
});
