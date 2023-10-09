import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createInput } from "../src/input";

const dummyInputContext = {
  schema: {
    entities: {},
    root: [],
  },
  entity: {
    id: "",
    inputs: {},
    type: "",
  },
};

describe("input", () => {
  it("can be created with minimal options", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return value;
      },
    });

    expect(input).toMatchSnapshot();

    expect(input.validate("test", dummyInputContext)).toMatchSnapshot();
  });

  it("can validate values", () => {
    const input = createInput({
      name: "label",
      validate(value) {
        return z.string().parse(value);
      },
    });

    expect(input.validate("valid", dummyInputContext)).toMatchSnapshot();

    expect(() =>
      input.validate(1, dummyInputContext),
    ).toThrowErrorMatchingSnapshot();
  });
});
