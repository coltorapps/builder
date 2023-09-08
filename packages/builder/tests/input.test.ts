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

    expect(input).toMatchSnapshot();

    expect(input.defaultValue()).toMatchSnapshot();

    expect(input.validate("test")).toMatchSnapshot();
  });

  it("can validate values", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return z.string().parse(value);
      },
    });

    expect(input.validate("valid")).toMatchSnapshot();

    expect(() => input.validate(1)).toThrowErrorMatchingSnapshot();
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

    expect(input.defaultValue()).toMatchSnapshot();
  });
});
